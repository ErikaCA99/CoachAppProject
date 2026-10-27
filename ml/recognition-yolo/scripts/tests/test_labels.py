import json
import sys
import shutil
import uuid
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import assert_trained_class_order, load_app_labels, validate_class_directories, write_class_map


class LocalWorkspace(unittest.TestCase):
    def setUp(self):
        self.base = Path(__file__).resolve().parents[1] / ".test-tmp"
        self.base.mkdir(exist_ok=True)
        self.root = self.base / uuid.uuid4().hex
        self.root.mkdir()

    def tearDown(self):
        if self.root.resolve().parent != self.base.resolve():
            raise RuntimeError("Directorio de prueba fuera del área prevista")
        shutil.rmtree(self.root)

class LabelContractTests(LocalWorkspace):
    def test_all_application_label_sources_have_identical_order(self):
        labels = load_app_labels()
        self.assertEqual(len(labels), 35)
        self.assertEqual(len(set(labels)), 35)

    def test_classifier_class_ids_are_sorted_folder_names_and_map_back_to_app(self):
        labels = load_app_labels()
        order = sorted(labels)
        root = self.root
        for split in ('train', 'val'):
            for name in labels:
                folder = root / split / name
                folder.mkdir(parents=True)
                (folder / 'sample.jpg').write_bytes(b'fake-but-present')
        self.assertEqual(validate_class_directories(root, labels), order)
        self.assertEqual(write_class_map(root, labels), order)
        mapping = json.loads((root / 'class-map.json').read_text())
        self.assertEqual(mapping[0]['clase'], order[0])
        self.assertEqual(mapping[0]['id_yolo'], 0)
        self.assertEqual(mapping[0]['indice_app'], labels.index(order[0]))
        assert_trained_class_order({i: name for i, name in enumerate(order)}, order)
        with self.assertRaisesRegex(ValueError, 'IDs de clase'):
            assert_trained_class_order({i: name for i, name in enumerate(labels)}, order)

    def test_missing_or_empty_validation_classes_block_training(self):
        labels = load_app_labels()
        root = self.root
        for split in ('train', 'val'):
            for name in labels:
                folder = root / split / name
                folder.mkdir(parents=True)
                if split == 'train' or name != labels[0]:
                    (folder / 'sample.jpg').write_bytes(b'present')
        with self.assertRaisesRegex(ValueError, 'vacías'):
            validate_class_directories(root, labels)

    def test_unexpected_classes_block_training(self):
        labels = load_app_labels()
        root = self.root
        for split in ('train', 'val'):
            for name in labels[:-1] + ['una-clase-oculta']:
                folder = root / split / name
                folder.mkdir(parents=True)
                (folder / 'sample.jpg').write_bytes(b'present')
        with self.assertRaisesRegex(ValueError, 'sobran'):
            validate_class_directories(root, labels)

if __name__ == '__main__':
    unittest.main()
