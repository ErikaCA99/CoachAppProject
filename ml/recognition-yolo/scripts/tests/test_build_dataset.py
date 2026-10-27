"""Pruebas de build_dataset.py con un catálogo sintético (necesitan opencv-python y numpy)."""
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

LABELS = ["clase-a", "clase-b", "clase-c", "clase-d"]
CONFIG = {"seed": 42, "cap_per_class": 60, "val_fraction": 0.15, "min_images_for_val": 4, "near_duplicate_bits": 6,
          "small_class_policy": "augmented_val_copy", "real_photo_repeats": 3, "external_classes": []}


def scene(seed: int):
    rng = np.random.default_rng(seed)
    small = rng.integers(0, 255, (8, 8, 3), dtype=np.uint8)
    return cv2.resize(small, (200, 160), interpolation=cv2.INTER_NEAREST)


@unittest.skipIf(cv2 is None, "opencv-python/numpy no instalados")
class BuildDatasetTests(unittest.TestCase):
    def setUp(self):
        import build_dataset
        self.module = build_dataset
        base = Path(__file__).resolve().parents[1] / ".test-tmp"
        base.mkdir(exist_ok=True)
        self.root = base / uuid.uuid4().hex
        self.root.mkdir()
        self.addCleanup(shutil.rmtree, self.root)
        self.catalog = self.root / "catalog"
        self.catalog.mkdir()
        (self.root / "real").mkdir()
        seed = 0

        def add(name, image):
            ok, buffer = cv2.imencode(".jpg", image)
            (self.catalog / name).write_bytes(buffer.tobytes())

        for i in range(10):  # clase-a: 10 ejemplares + 1 espejo del primero
            seed += 1
            add(f"clase-a--{seed:020x}.jpg", scene(seed))
            if i == 0:
                add(f"clase-a--{seed + 5000:020x}.jpg", cv2.flip(scene(seed), 1))
                self.mirror = (f"clase-a--{seed:020x}.jpg", f"clase-a--{seed + 5000:020x}.jpg")
        for i in range(6):
            seed += 1
            add(f"clase-b--{seed:020x}.jpg", scene(seed))
        add("clase-c-02.jpeg", scene(901))      # clase pequeña: 2 fotos
        add("clase-c--" + "c" * 20 + ".jpg", scene(902))
        add("clase-d.webp", scene(903))         # clase con una sola foto
        add("Hot-Sale-Gym.webp", scene(904))    # nombre sin clase del catálogo

    def run_build(self, config=None, mode="eval"):
        cfg = dict(CONFIG, **(config or {}))
        patches = [patch.object(self.module, "CATALOG_DIR", self.catalog),
                   patch.object(self.module, "EXTERNAL_DIR", self.root / "none"),
                   patch.object(self.module, "REAL_DIR", self.root / "real"),
                   patch.object(self.module, "BUILD_DIR", self.root / "build"),
                   patch.object(self.module, "load_config", return_value=cfg),
                   patch.object(self.module, "load_app_labels", return_value=LABELS),
                   patch.object(sys, "argv", ["build_dataset.py", "--mode", mode])]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.module.main()
        return self.root / "build" / f"ds_{mode}"

    def names(self, folder: Path):
        return {p.name for p in folder.glob("*")}

    def test_every_class_reaches_val_and_unknown_names_are_ignored(self):
        out = self.run_build()
        for clase in LABELS:
            self.assertTrue(list((out / "val" / clase).glob("*")), f"{clase} sin val")
        stats = json.loads((out / "stats.json").read_text(encoding="utf-8"))
        self.assertEqual(stats["ignoradas_sin_clase"], ["Hot-Sale-Gym.webp"])
        self.assertEqual(sorted(stats["val_sintetica"]), ["clase-c", "clase-d"])
        self.assertTrue(all(n.startswith("valaug_") for n in self.names(out / "val" / "clase-c")))

    def test_mirrored_copy_stays_on_the_same_side_and_classes_do_not_leak(self):
        out = self.run_build()
        first, mirrored = self.mirror
        train, val = self.names(out / "train" / "clase-a"), self.names(out / "val" / "clase-a")
        self.assertEqual(first in val, mirrored in val)
        self.assertEqual(first in train, mirrored in train)
        self.assertFalse(train & val)
        self.assertGreaterEqual(len(val), 1)
        self.assertGreaterEqual(len(train), 1)

    def test_split_is_reproducible(self):
        first = self.run_build()
        snapshot = {s: sorted(p.name for p in (first / s).glob("*/*")) for s in ("train", "val")}
        shutil.rmtree(self.root / "build")
        second = self.run_build()
        self.assertEqual(snapshot, {s: sorted(p.name for p in (second / s).glob("*/*")) for s in ("train", "val")})

    def test_error_policy_keeps_the_strict_behaviour(self):
        with self.assertRaisesRegex(ValueError, "validación limpia"):
            self.run_build({"small_class_policy": "error"})

    def test_final_mode_adds_real_photos_to_train_only(self):
        real = self.root / "real" / "clase-a"
        real.mkdir()
        ok, buffer = cv2.imencode(".jpg", scene(999))
        (real / "gym.jpg").write_bytes(buffer.tobytes())
        out = self.run_build(mode="final")
        self.assertEqual(len(list((out / "train" / "clase-a").glob("r*_gym.jpg"))), 3)
        self.assertFalse(list((out / "val").glob("*/*gym*")))
        self.assertFalse((out / "test").exists())


if __name__ == "__main__":
    unittest.main()
