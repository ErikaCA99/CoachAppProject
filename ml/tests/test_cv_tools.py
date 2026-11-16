"""Pruebas de ml/cv_tools.py con imágenes sintéticas (necesitan opencv-python y numpy)."""
import sys
import unittest
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:  # el entorno de pruebas puede no tener OpenCV
    cv2 = None

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@unittest.skipIf(cv2 is None, "opencv-python/numpy no instalados")
class CvToolsTests(unittest.TestCase):
    def setUp(self):
        import cv_tools
        self.cv = cv_tools
        rng = np.random.default_rng(0)
        # Escena con estructura: bloques de colores y líneas (nítida) en 400x300.
        base = np.full((300, 400, 3), 200, np.uint8)
        for i in range(12):
            x, y = int(rng.integers(0, 340)), int(rng.integers(0, 240))
            cv2.rectangle(base, (x, y), (x + 60, y + 50), tuple(int(c) for c in rng.integers(0, 255, 3)), -1)
            cv2.line(base, (x, y), (x + 60, y + 50), (0, 0, 0), 2)
        self.sharp = base

    def test_quality_flags_blur_dark_small_and_flat(self):
        q = self.cv.image_quality(self.sharp)
        self.assertTrue(q["ok"], q)
        blurred = cv2.GaussianBlur(self.sharp, (31, 31), 0)
        self.assertIn("borrosa", self.cv.image_quality(blurred)["motivos"])
        dark = (self.sharp * 0.1).astype(np.uint8)
        self.assertIn("muy_oscura", self.cv.image_quality(dark)["motivos"])
        tiny = cv2.resize(self.sharp, (100, 80))
        self.assertIn("baja_resolucion", self.cv.image_quality(tiny)["motivos"])
        flat = np.full((300, 400, 3), 128, np.uint8)
        self.assertIn("sin_contenido", self.cv.image_quality(flat)["motivos"])

    def test_dhash_groups_mirrors_and_recompressions_but_not_different_scenes(self):
        mirrored = cv2.flip(self.sharp, 1)
        ok, buf = cv2.imencode(".jpg", self.sharp, [cv2.IMWRITE_JPEG_QUALITY, 60])
        recompressed = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        other = np.random.default_rng(5).integers(0, 255, (300, 400, 3), dtype=np.uint8)
        other = cv2.GaussianBlur(other, (0, 0), 6)
        hashes = {"a": self.cv.dhash(self.sharp), "b": self.cv.dhash(mirrored),
                  "c": self.cv.dhash(recompressed), "d": self.cv.dhash(other)}
        groups = self.cv.group_near_duplicates(hashes, threshold=6)
        self.assertIn(["a", "b", "c"], groups)
        self.assertIn(["d"], groups)

    def test_center_crop_matches_app_geometry(self):
        wide = np.zeros((100, 300, 3), np.uint8)
        wide[:, 100:200] = 255  # franja central 100x100 blanca
        out = self.cv.center_square_crop_resize(wide, 50)
        self.assertEqual(out.shape, (50, 50, 3))
        self.assertGreater(out.mean(), 250)  # solo se ve la franja central
        tall = np.zeros((300, 100, 3), np.uint8)
        tall[100:200] = 255
        self.assertGreater(self.cv.center_square_crop_resize(tall, 50).mean(), 250)

    def test_augmentation_keeps_shape_dtype_and_is_reproducible(self):
        first = self.cv.augment_photometric(self.sharp, np.random.default_rng(42))
        second = self.cv.augment_photometric(self.sharp, np.random.default_rng(42))
        self.assertEqual(first.shape, self.sharp.shape)
        self.assertEqual(first.dtype, np.uint8)
        self.assertTrue(np.array_equal(first, second))
        changed = [not np.array_equal(self.cv.augment_photometric(self.sharp, np.random.default_rng(s)), self.sharp)
                   for s in range(10)]
        self.assertGreaterEqual(sum(changed), 8)

    def test_unicode_paths_roundtrip(self):
        import tempfile
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as tmp:
            path = Path(tmp) / "máquina ñandú.jpg"
            self.cv.write_jpeg(path, self.sharp)
            loaded = self.cv.read_image(path)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded.shape, self.sharp.shape)
            self.assertIsNone(self.cv.read_image(Path(tmp) / "no-existe.jpg"))
            (Path(tmp) / "vacio.jpg").write_bytes(b"")
            self.assertIsNone(self.cv.read_image(Path(tmp) / "vacio.jpg"))

    def test_audit_folder_reports_duplicates_and_rejects(self):
        import tempfile
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as tmp:
            folder = Path(tmp)
            self.cv.write_jpeg(folder / "a.jpg", self.sharp)
            self.cv.write_jpeg(folder / "a-espejo.jpg", cv2.flip(self.sharp, 1))
            self.cv.write_jpeg(folder / "borrosa.jpg", cv2.GaussianBlur(self.sharp, (41, 41), 0))
            (folder / "roto.jpg").write_bytes(b"no es una imagen")
            report = self.cv.audit_folder(folder)
            self.assertEqual(report["ilegibles"], ["roto.jpg"])
            self.assertIn("borrosa.jpg", report["rechazables"])
            self.assertTrue(any({"a.jpg", "a-espejo.jpg"} <= set(g) for g in report["grupos_casi_duplicados"]))


if __name__ == "__main__":
    unittest.main()
