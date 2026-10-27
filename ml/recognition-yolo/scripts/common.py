"""Rutas y utilidades compartidas del pipeline YOLO de reconocimiento de máquinas."""
import importlib.metadata
import json
import platform
import re
import sys
from pathlib import Path

PIPE = Path(__file__).resolve().parents[1]          # ml/recognition-yolo
ROOT = PIPE.parents[1]                               # raíz de coach-app
sys.path.insert(0, str(ROOT / "ml"))                 # cv_tools.py y model_manifest.py viven en ml/

_CATALOG_CANDIDATES = (                              # el catálogo según cómo se haya extraído data.zip
    ROOT / "ml/detection/dataset/images",
    ROOT / "ml/detection/dataset/data/images/train",
    ROOT / "ml/detection/dataset/data/images",
)


def resolve_catalog_dir() -> Path:
    """Primera carpeta de catálogo que exista y tenga archivos; si ninguna, la primera candidata."""
    for candidate in _CATALOG_CANDIDATES:
        if candidate.is_dir() and any(p.is_file() for p in candidate.iterdir()):
            return candidate
    return _CATALOG_CANDIDATES[0]


# Nombres de foto aceptados: `clase--<hash>.jpg`, `clase-02.jpeg` o `clase.webp`.
_FILENAME_CLASS = re.compile(r"^(?P<clase>.+?)(?:--[0-9a-f]{8,}|-\d{1,3})?$")


def class_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    match = _FILENAME_CLASS.match(stem)
    return match.group("clase") if match else stem


CATALOG_DIR = resolve_catalog_dir()                           # fotos de catálogo: {clase}--{hash}.jpg
EXTERNAL_DIR = ROOT / "ml/detection/dataset/externo-kaggle"   # fotos externas: {clase}/{archivo}
REAL_DIR = PIPE / "data/real_photos"                          # fotos de gimnasios: {clase}/{archivo}
APP_LABELS = ROOT / "ml/results/recognition/labels.json"      # orden de clases que espera la app
MIRROR_LABELS = PIPE / "model/labels.json"
APP_TYPESCRIPT_LABELS = ROOT / "src/services/ai/machineLabels.ts"
BUILD_DIR = PIPE / "_build"                                   # datasets generados (no se versionan)
RUNS_DIR = PIPE / "runs"                                      # corridas de entrenamiento (no se versionan)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def load_config() -> dict:
    return json.loads((PIPE / "config.json").read_text(encoding="utf-8"))


def load_app_labels() -> list[str]:
    """Compara las tres fuentes versionadas del mapa de clases de la app."""
    import re

    primary = json.loads(APP_LABELS.read_text(encoding="utf-8"))["etiquetas"]
    mirror = json.loads(MIRROR_LABELS.read_text(encoding="utf-8"))["etiquetas"]
    source = APP_TYPESCRIPT_LABELS.read_text(encoding="utf-8")
    block = re.search(r"ETIQUETAS_MAQUINAS[^=]*=\s*\[(.*?)\]", source, re.S)
    if not block:
        raise ValueError("No se encontró el arreglo ETIQUETAS_MAQUINAS de la app")
    typescript = re.findall(r"[\"']([^\"']+)[\"']", block.group(1))
    if not (len(primary) == 35 and len(set(primary)) == 35):
        raise ValueError("labels.json debe tener exactamente 35 clases únicas")
    if primary != mirror or primary != typescript:
        raise ValueError("Desalineación de clases/orden entre results/recognition/labels.json, model/labels.json y machineLabels.ts")
    return primary


def validate_class_directories(dataset: Path, labels: list[str]) -> list[str]:
    """YOLO-cls asigna class_id por orden alfabético de carpetas; nunca consume el JSON."""
    expected = sorted(labels)
    for split in ("train", "val"):
        root = dataset / split
        found = sorted(p.name for p in root.iterdir() if p.is_dir()) if root.is_dir() else []
        missing, extra = sorted(set(expected) - set(found)), sorted(set(found) - set(expected))
        empty = [name for name in expected if not list((root / name).glob("*"))]
        if missing or extra or empty:
            raise ValueError(f"Clases YOLO-cls incorrectas en {split}: faltan={missing}, sobran={extra}, vacías={empty}")
    return expected


def assert_trained_class_order(model_names: dict, expected: list[str]) -> None:
    """Bloquea exportación/evaluación si el checkpoint cambió el ID de una clase."""
    actual = [model_names[i] for i in range(len(model_names))]
    if actual != expected:
        raise ValueError(f"IDs de clase de YOLO distintos del orden alfabético del dataset: {actual}")


def write_class_map(dataset: Path, labels: list[str]) -> list[str]:
    expected = validate_class_directories(dataset, labels)
    mapping = [{"id_yolo": i, "clase": name, "indice_app": labels.index(name)}
               for i, name in enumerate(expected)]
    (dataset / "class-map.json").write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return expected


def write_training_context(run_dir: Path, cfg: dict, extra: dict | None = None) -> None:
    """Deja en la carpeta de la corrida lo necesario para reproducirla (igual que ml/detection)."""
    run_dir.mkdir(parents=True, exist_ok=True)

    def version(name: str):
        try:
            return importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            return None

    context = {"python": platform.python_version(), "plataforma": platform.platform(),
               "ultralytics": version("ultralytics"), "torch": version("torch"),
               "opencv-python": version("opencv-python"), "configuracion": cfg}
    context.update(extra or {})
    (run_dir / "training_context.json").write_text(json.dumps(context, ensure_ascii=False, indent=2), encoding="utf-8")
    packages = sorted(f"{d.metadata['Name']}=={d.version}" for d in importlib.metadata.distributions())
    (run_dir / "environment.lock.txt").write_text("\n".join(packages) + "\n", encoding="utf-8")
