"""Pruebas de yolo_folder.py: split por grupos sin fuga, data.yaml portable y verificación posterior.

Necesitan opencv-python y numpy (se omiten si no están). No requieren PyTorch ni Ultralytics.
"""
import contextlib
import io
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pipeline
import itertools
from unittest.mock import patch

import yolo_folder
from yolo_folder import (SPLITS, BuildIncomplete, build_yolo_folder, read_data_yaml, stratum_of,
                         verify_yolo_folder)

CLASSES = ["banco-pecho", "escaladora", "smith", "pec-deck"]


def scene(seed: int, size=(160, 200)) -> "np.ndarray":
    """Imagen con estructura propia por semilla (bloques de color): hashes perceptuales distintos."""
    rng = np.random.default_rng(seed)
    small = rng.integers(0, 255, (8, 8, 3), dtype=np.uint8)
    return cv2.resize(small, (size[1], size[0]), interpolation=cv2.INTER_NEAREST)


@unittest.skipIf(cv2 is None, "opencv-python/numpy no instalados")
class YoloFolderTests(unittest.TestCase):
    def setUp(self):
        base = Path(__file__).resolve().parents[1] / ".test-tmp"
        base.mkdir(exist_ok=True)
        self.root = base / uuid.uuid4().hex
        self.root.mkdir()
        self.addCleanup(shutil.rmtree, self.root)
        self.source = self.root / "data"
        (self.source / "images" / "train").mkdir(parents=True)
        (self.source / "labels" / "train").mkdir(parents=True)
        (self.source / "classes.txt").write_text("\n".join(CLASSES) + "\n")
        seed = 0
        self.mirror_pair = None
        for clase, groups in {"banco-pecho": 6, "smith": 4, "escaladora": 2}.items():
            for g in range(groups):
                seed += 1
                self.add(f"{clase}--{seed:020x}.jpg", scene(seed))
                if clase == "banco-pecho" and g == 0:  # espejo del mismo ejemplar: debe viajar con el original
                    self.add(f"{clase}--{seed + 1000:020x}.jpg", cv2.flip(scene(seed), 1))
                    self.mirror_pair = (f"{clase}--{seed:020x}.jpg", f"{clase}--{seed + 1000:020x}.jpg")
        self.add("pec-deck-02.jpeg", scene(77))
        self.add("Hot-Sale-Gym-Equipment.webp", scene(88))

    def add(self, name: str, image) -> None:
        ok, buffer = cv2.imencode(".jpg", image)
        (self.source / "images" / "train" / name).write_bytes(buffer.tobytes())
        (self.source / "labels" / "train" / (Path(name).stem + ".txt")).write_text("0 0.5 0.5 0.6 0.6\n")

    def build(self, **kwargs):
        return build_yolo_folder(self.source, self.root / "yolo", **kwargs)

    def split_of(self, name: str) -> str:
        return next(s for s in SPLITS if (self.root / "yolo/images" / s / name).is_file())

    def test_stratum_parsing(self):
        known = set(CLASSES) | {"palanca-peso-muerto"}
        self.assertEqual(stratum_of("escaladora-02.jpeg", known), "escaladora")
        self.assertEqual(stratum_of("palanca-peso-muerto-2.jpeg", known), "palanca-peso-muerto")
        self.assertEqual(stratum_of("smith--" + "a" * 20 + ".jpg", known), "smith")
        self.assertEqual(stratum_of("Hot-Sale-Gym-Equipment.webp", known), "sin-clase")

    def test_build_is_valid_portable_and_single_class_when_all_labels_are_zero(self):
        report = self.build()
        self.assertTrue(report["listo"], report["errores"])
        self.assertEqual(report["nombres"], ["maquina"])
        text = (self.root / "yolo/data.yaml").read_text()
        self.assertNotRegex(text, r"(?m)^path:")  # un path relativo se resolvería contra la carpeta de datasets
        config = read_data_yaml(self.root / "yolo/data.yaml")
        self.assertEqual((config["train"], config["val"], config["test"]), ("images/train", "images/val", "images/test"))
        self.assertTrue(any("UNA clase" in w for w in report["avisos"]))
        for split in SPLITS:
            self.assertGreater(report["resumen"][split]["imagenes"], 0)

    def test_mirrored_copy_never_crosses_partitions(self):
        self.build()
        original, mirrored = self.mirror_pair
        self.assertEqual(self.split_of(original), self.split_of(mirrored))

    def test_classes_with_enough_groups_reach_val_and_test_and_small_ones_stay_in_train(self):
        self.build()
        manifest = json.loads((self.root / "yolo/dataset-manifest.json").read_text())
        by_stratum = {}
        for record in manifest["archivos"]:
            by_stratum.setdefault(record["estrato"], set()).add(record["split"])
        self.assertEqual(by_stratum["banco-pecho"], {"train", "val", "test"})
        self.assertEqual(by_stratum["smith"], {"train", "val", "test"})
        self.assertEqual(by_stratum["escaladora"], {"train"})
        self.assertEqual(by_stratum["pec-deck"], {"train"})
        self.assertEqual(by_stratum["sin-clase"], {"train"})
        self.assertTrue(any("escaladora" in w and "train" in w for w in manifest["advertencias"]))

    def test_same_seed_gives_same_partition(self):
        self.build()
        first = json.loads((self.root / "yolo/dataset-manifest.json").read_text())["archivos"]
        shutil.rmtree(self.root / "yolo")
        self.build()
        second = json.loads((self.root / "yolo/dataset-manifest.json").read_text())["archivos"]
        self.assertEqual([(r["imagen"], r["split"]) for r in first], [(r["imagen"], r["split"]) for r in second])

    def test_refuses_to_overwrite_and_missing_labels_block(self):
        self.build()
        with self.assertRaisesRegex(ValueError, "ya existe"):
            self.build()
        shutil.rmtree(self.root / "yolo")
        (self.source / "labels" / "train" / "smith--00000000000000000008.txt").unlink(missing_ok=True)
        victim = next((self.source / "labels" / "train").glob("smith--*.txt"))
        victim.unlink()
        with self.assertRaisesRegex(ValueError, "Sin etiqueta"):
            self.build()

    def test_verify_detects_changed_label_and_cross_split_duplicate(self):
        self.build()
        label = next((self.root / "yolo/labels/val").glob("*.txt"))
        label.write_text("0 0.5 0.5 0.2 0.2\n")
        self.assertTrue(any("Modificado" in e for e in verify_yolo_folder(self.root / "yolo")["errores"]))
        label.write_text("0 0.5 0.5 0.6 0.6\n")
        val_image = next((self.root / "yolo/images/val").glob("*.jpg"))
        train_image = next((self.root / "yolo/images/train").glob("*.jpg"))
        shutil.copyfile(train_image, val_image)
        errors = verify_yolo_folder(self.root / "yolo")["errores"]
        self.assertTrue(any("duplicada" in e for e in errors), errors)

    def test_augmented_copies_go_to_train_only_with_identical_labels(self):
        report = self.build(augment_copies=2)
        self.assertTrue(report["listo"], report["errores"])
        self.assertEqual(list((self.root / "yolo/images/val").glob("aug*")), [])
        self.assertEqual(list((self.root / "yolo/images/test").glob("aug*")), [])
        augmented = sorted((self.root / "yolo/images/train").glob("aug*"))
        self.assertGreater(len(augmented), 0)
        for image in augmented:
            label = self.root / "yolo/labels/train" / f"{image.stem}.txt"
            self.assertEqual(label.read_text(), "0 0.5 0.5 0.6 0.6\n")
        manifest = json.loads((self.root / "yolo/dataset-manifest.json").read_text())
        self.assertEqual(manifest["aumentadas"], len(augmented))

    def test_multiclass_names_used_when_labels_use_several_classes(self):
        for index, label in enumerate(sorted((self.source / "labels" / "train").glob("*.txt"))):
            label.write_text(f"{index % 3} 0.5 0.5 0.6 0.6\n")
        report = self.build()
        self.assertEqual(report["nombres"], CLASSES)

    def test_invalid_label_is_excluded_with_a_warning_not_fatal(self):
        bad = sorted((self.source / "labels" / "train").glob("*.txt"))[0]
        bad.write_text("0 0.8 0.9 0.0 0.001\n")
        report = self.build()
        self.assertTrue(report["listo"], report["errores"])
        manifest = json.loads((self.root / "yolo/dataset-manifest.json").read_text())
        self.assertTrue(any("Etiquetas inválidas" in w and bad.name in w for w in manifest["advertencias"]))
        self.assertNotIn(bad.stem, {Path(r["imagen"]).stem for r in manifest["archivos"]})

    def test_time_budget_saves_progress_and_resumes_to_the_same_result(self):
        clock = itertools.chain([0.0] * 8, itertools.repeat(100.0))  # 3 fotos (2 lecturas de reloj por foto) y se agota
        with patch.object(yolo_folder.time, "monotonic", side_effect=lambda: next(clock)):
            with self.assertRaises(BuildIncomplete):
                self.build(max_seconds=1.0)
        self.assertFalse((self.root / "yolo").exists())  # nada a medias
        cache = json.loads((self.root / ".yolo-features.json").read_text())
        self.assertEqual(len(cache), 3)
        self.build()
        resumed = [(r["imagen"], r["split"]) for r in
                   json.loads((self.root / "yolo/dataset-manifest.json").read_text())["archivos"]]
        shutil.rmtree(self.root / "yolo")
        (self.root / ".yolo-features.json").unlink()
        self.build()
        straight = [(r["imagen"], r["split"]) for r in
                    json.loads((self.root / "yolo/dataset-manifest.json").read_text())["archivos"]]
        self.assertEqual(resumed, straight)

    def test_pipeline_cli_wiring(self):
        parser = pipeline.create_parser()
        args = parser.parse_args(["yolo-folder", "--augment-copies", "1", "--seed", "7"])
        self.assertEqual((args.augment_copies, args.seed, args.dup_threshold, args.check_only), (1, 7, 6, False))
        self.build()
        train_args = parser.parse_args(["train", "--data-yaml", str(self.root / "yolo/data.yaml"), "--dry-run"])
        with contextlib.redirect_stdout(io.StringIO()) as out:
            pipeline.train(train_args)
        printed = json.loads(out.getvalue())
        self.assertTrue(printed["dataset"]["listo"])
        self.assertTrue(printed["data"].endswith("data.yaml"))
        # sin --data-yaml el flujo anterior sigue igual
        self.assertIsNone(parser.parse_args(["train"]).data_yaml)


if __name__ == "__main__":
    unittest.main()
