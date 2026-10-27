"""Pruebas de configuración, aislamiento de datos y selección de validación.

Solo biblioteca estándar: no requieren instalar Jest, PyTorch ni Ultralytics.
"""
import argparse
import contextlib
import io
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pipeline
from training import inspect_dataset, parse_batch, read_classes, training_options


@contextlib.contextmanager
def test_workspace():
    # Directorio local: algunos sandboxes Windows no heredan acceso a mkdtemp.
    base = Path(__file__).resolve().parents[1] / ".test-tmp"
    base.mkdir(exist_ok=True)
    directory = base / uuid.uuid4().hex
    directory.mkdir()
    try:
        yield directory
    finally:
        if directory.resolve().parent != base.resolve():
            raise RuntimeError("Directorio temporal fuera del área de pruebas")
        shutil.rmtree(directory)


class TrainingConfigTests(unittest.TestCase):
    def test_batch_supports_fixed_auto_and_fraction(self):
        for text, expected in [("8", 8), ("16", 16), ("-1", -1), ("0.7", .7)]:
            with self.subTest(text=text):
                self.assertEqual(parse_batch(text), expected)
        for value in ["0", "-2", "1.5", "nan", "inf", "abc"]:
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                parse_batch(value)

    def test_cuda_autobatch_and_cli_override(self):
        args = pipeline.create_parser().parse_args(["train", "--device", "0", "--batch", "0.7", "--epochs", "200"])
        config = training_options(args)
        self.assertEqual(config["batch"], .7)
        self.assertEqual(config["epochs"], 200)
        self.assertEqual(config["patience"], 30)
        self.assertEqual(args.model, "yolov8n.pt")

    def test_cpu_autobatch_fails_explicitly(self):
        args = pipeline.create_parser().parse_args(["train", "--batch", "-1"])
        with self.assertRaisesRegex(ValueError, "CUDA"):
            training_options(args)

    def test_invalid_epochs_imgsz_and_short_mosaic_are_rejected(self):
        for flags in [["--epochs", "0"], ["--imgsz", "641"], ["--epochs", "5"]]:
            with self.subTest(flags=flags), self.assertRaises(ValueError):
                training_options(pipeline.create_parser().parse_args(["train", *flags]))

    def test_smoke_run_can_disable_mosaic_closure(self):
        args = pipeline.create_parser().parse_args(["train", "--epochs", "5", "--close-mosaic", "0"])
        self.assertEqual(training_options(args)["close_mosaic"], 0)

    def test_config_typo_does_not_silently_pass(self):
        with test_workspace() as temp:
            config = Path(temp) / "config.json"
            config.write_text('{"epoch": 200}')
            args = pipeline.create_parser().parse_args(["train", "--config", str(config)])
            with self.assertRaisesRegex(ValueError, "desconocidas"):
                training_options(args)


class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.root = self.enterContext(test_workspace())
        (self.root / "labels").mkdir()
        (self.root / "images").mkdir()
        self.records = []
        for i in range(6):
            name = f"foto-{i}.jpg"
            (self.root / "images" / name).write_bytes(f"fixture-{i}".encode())
            (self.root / "labels" / f"foto-{i}.txt").write_text("0 0.5 0.5 0.8 0.8\n")
            self.records.append({"imagen": name, "clase_sugerida": 0})
        pipeline.write_json(self.root / "manifest.json", {"names": ["prensa"], "imagenes": self.records})

    def build(self, plan=None):
        with contextlib.redirect_stdout(io.StringIO()):
            pipeline.build(SimpleNamespace(dataset=self.root, split_plan=plan))

    def test_build_produces_complete_disjoint_partitions(self):
        self.build()
        report = inspect_dataset(self.root)
        self.assertTrue(report["listo"], report["errores"])
        self.assertEqual(sum(p["imagenes"] for p in report["particiones"].values()), 6)
        self.assertTrue(any("sesión/ejemplar" in w for w in report["avisos"]))

    def test_missing_annotation_blocks_training(self):
        (self.root / "labels/foto-0.txt").unlink()
        report = inspect_dataset(self.root)
        self.assertFalse(report["listo"])
        self.assertEqual(report["anotaciones_pendientes"], 1)

    def test_manifest_does_not_prove_images_exist(self):
        self.build()
        (self.root / "images/foto-0.jpg").unlink()
        report = inspect_dataset(self.root)
        self.assertFalse(report["listo"])
        self.assertEqual(report["imagenes_faltantes"], 1)

    def test_labels_reject_nan_and_boxes_outside_image(self):
        path = self.root / "invalid.txt"
        for row in ["0 nan .5 .5 .5", "0 .9 .5 .8 .5", "1 .5 .5 .1 .1", "0 .5 .5 0 .5"]:
            path.write_text(row)
            with self.subTest(row=row), self.assertRaises(ValueError):
                read_classes(path, 1)

    def test_duplicate_pixels_between_splits_are_rejected(self):
        self.build()
        train_image = next((self.root / "split/images/train").glob("*.jpg"))
        val_image = next((self.root / "split/images/val").glob("*.jpg"))
        val_image.write_bytes(train_image.read_bytes())
        report = inspect_dataset(self.root)
        self.assertTrue(any("duplicada" in e for e in report["errores"]))

    def test_changed_annotation_requires_rebuild(self):
        self.build()
        (self.root / "labels/foto-0.txt").write_text("0 .5 .5 .2 .2")
        self.assertTrue(any("modificada" in e for e in inspect_dataset(self.root)["errores"]))

    def test_untracked_images_in_split_are_rejected(self):
        self.build()
        (self.root / "split/images/train/untracked.jpg").write_bytes(b"extra")
        self.assertTrue(any("Archivos extra" in e for e in inspect_dataset(self.root)["errores"]))

    def test_split_plan_keeps_groups_together(self):
        plan = {record["imagen"]: {"grupo": f"ejemplar-{i//2}", "split": ["train", "val", "test"][i//2]}
                for i, record in enumerate(self.records)}
        path = self.root / "plan.json"
        pipeline.write_json(path, plan)
        self.build(path)
        report = inspect_dataset(self.root)
        self.assertTrue(report["listo"], report["errores"])
        self.assertFalse(any("Split por foto" in w for w in report["avisos"]))

    def test_split_plan_rejects_session_leak_before_copying(self):
        plan = {record["imagen"]: {"grupo": "misma-sesion", "split": ["train", "val", "test"][i % 3]}
                for i, record in enumerate(self.records)}
        path = self.root / "plan.json"
        pipeline.write_json(path, plan)
        with self.assertRaisesRegex(ValueError, "cruza"):
            self.build(path)
        self.assertFalse((self.root / "split").exists())


class TrainingFlowTests(unittest.TestCase):
    def test_training_never_uses_test_for_experiment_selection(self):
        args = pipeline.create_parser().parse_args(["train"])
        model, detector = MagicMock(), MagicMock()
        model.task = "detect"
        model.trainer.best = "run/weights/best.pt"
        model.trainer.batch_size = 8
        fake_yolo = MagicMock(side_effect=[model, detector])
        with patch.dict(sys.modules, {"ultralytics": SimpleNamespace(YOLO=fake_yolo)}), \
                patch.object(pipeline, "inspect_dataset", return_value={"listo": True}), \
                patch.object(pipeline, "require_dataset"), patch.object(pipeline, "save_metrics"):
            pipeline.train(args)
        self.assertEqual(detector.val.call_args.kwargs["split"], "val")
        self.assertEqual(model.train.call_args.kwargs["patience"], 30)
        self.assertEqual(model.train.call_args.kwargs["optimizer"], "AdamW")

    def test_dry_run_does_not_start_training(self):
        args = pipeline.create_parser().parse_args(["train", "--dry-run"])
        with patch.object(pipeline, "inspect_dataset", return_value={"listo": False}), \
                patch.object(pipeline, "require_dataset") as require, \
                contextlib.redirect_stdout(io.StringIO()) as output:
            pipeline.train(args)
        require.assert_not_called()
        self.assertFalse(json.loads(output.getvalue())["dataset"]["listo"])


if __name__ == "__main__":
    unittest.main()
