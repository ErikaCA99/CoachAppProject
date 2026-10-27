"""Pruebas del manifiesto de modelo (ml/model_manifest.py + scripts/make_manifest.py). Solo biblioteca estándar."""
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import make_manifest
from common import PIPE, ROOT, load_config
from model_manifest import build_manifest, verify_manifest

LABELS = json.loads((PIPE / "model/labels.json").read_text(encoding="utf-8"))["etiquetas"]


class ManifestTests(unittest.TestCase):
    def setUp(self):
        base = Path(__file__).resolve().parents[1] / ".test-tmp"
        base.mkdir(exist_ok=True)
        self.root = base / uuid.uuid4().hex
        self.root.mkdir()
        self.addCleanup(shutil.rmtree, self.root)
        self.tflite = self.root / "modelo.tflite"
        self.tflite.write_bytes(b"TFL3" + bytes(range(256)) * 8)

    def create(self, stage="final"):
        return make_manifest.create_manifest(self.tflite, stage, labels=LABELS, version="test", app_threshold=0.8)

    def test_manifest_matches_file_and_labels(self):
        path = self.create()
        self.assertEqual(path.name, "modelo.manifest.json")
        self.assertEqual(verify_manifest(path), [])
        manifest = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(manifest["etiquetas"]["orden"], LABELS)
        self.assertEqual(manifest["salida"]["forma"], [1, 35])
        self.assertEqual(manifest["umbrales"]["confianza_minima_app"], 0.8)
        self.assertTrue(manifest["umbrales"]["recalibrar"])

    def test_changed_model_or_reordered_labels_are_detected(self):
        path = self.create()
        self.tflite.write_bytes(self.tflite.read_bytes() + b"x")
        self.assertTrue(any("tamaño" in p or "sha256" in p for p in verify_manifest(path)))
        self.tflite.write_bytes(b"TFL3" + bytes(range(256)) * 8)
        self.assertEqual(verify_manifest(path), [])
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["etiquetas"]["orden"][0], manifest["etiquetas"]["orden"][1] = LABELS[1], LABELS[0]
        path.write_text(json.dumps(manifest), encoding="utf-8")
        self.assertTrue(any("etiquetas" in p.lower() for p in verify_manifest(path)))

    def test_labels_file_of_the_app_is_compared_when_given(self):
        path = self.create()
        good = self.root / "labels.json"
        good.write_text(json.dumps({"etiquetas": LABELS}), encoding="utf-8")
        self.assertEqual(verify_manifest(path, good), [])
        bad = self.root / "labels-bad.json"
        bad.write_text(json.dumps({"etiquetas": LABELS[::-1]}), encoding="utf-8")
        self.assertTrue(any("difiere" in p for p in verify_manifest(path, bad)))

    def test_classifier_output_must_have_one_probability_per_label(self):
        path = self.create()
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["salida"]["forma"] = [1, 34]
        path.write_text(json.dumps(manifest), encoding="utf-8")
        self.assertTrue(any("probabilidad por etiqueta" in p for p in verify_manifest(path)))

    def test_final_stage_warns_that_there_is_no_clean_test(self):
        manifest = json.loads(self.create("final").read_text(encoding="utf-8"))
        self.assertTrue(any("no tiene prueba limpia" in w for w in manifest["advertencias"]))
        manifest = json.loads(self.create("eval").read_text(encoding="utf-8"))
        self.assertFalse(any("no tiene prueba limpia" in w for w in manifest["advertencias"]))

    def test_evaluation_comes_from_recorded_rows_not_from_memory(self):
        rows_file = PIPE / "results/test_real_photos_yolo.json"
        if not rows_file.is_file():
            self.skipTest("sin resultados de evaluación en este equipo")
        rows = json.loads(rows_file.read_text(encoding="utf-8"))
        evaluation = json.loads(self.create().read_text(encoding="utf-8"))["evaluacion"]
        self.assertEqual(evaluation["fotos"], len(rows))
        self.assertEqual(evaluation["top1"]["aciertos"], sum(r[0] == r[1] for r in rows))
        self.assertIsNone(evaluation["top3"])  # no se inventa una cifra que no se guardó

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "stage"):
            make_manifest.create_manifest(self.tflite, "otra", labels=LABELS)
        with self.assertRaisesRegex(ValueError, "únicas"):
            build_manifest(model_file=self.tflite, task="classify", family="x", version="1", labels=["a", "a"],
                           input_spec={}, output_spec={}, preprocessing={}, thresholds={}, training={},
                           evaluation={}, data={}, verification={}, warnings=[])

    def test_committed_manifests_describe_the_files_next_to_them(self):
        manifests = sorted((PIPE / "model").glob("*.manifest.json"))
        if not manifests:
            self.skipTest("todavía no hay manifiestos en model/")
        for path in manifests:
            with self.subTest(path=path.name):
                labels = ROOT / "ml/results/recognition/labels.json"
                self.assertEqual(verify_manifest(path, labels if labels.is_file() else None), [])


if __name__ == "__main__":
    unittest.main()
