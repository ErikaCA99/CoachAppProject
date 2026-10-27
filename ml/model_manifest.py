"""Manifiesto de modelo (`manifest.json`): la "ficha técnica" que viaja junto al `.tflite`.

Para qué sirve:
  - la app (o un test) puede comprobar que el archivo es EXACTAMENTE el que se evaluó (sha256, tamaño);
  - deja escritos el contrato de entrada/salida, el preprocesamiento y el ORDEN de clases, que es lo
    primero que se rompe al cambiar de modelo;
  - separa las métricas medidas de las que no existen y lista las advertencias (datos, licencias, etapa
    `final` sin prueba limpia), para no presentar una cifra como más sólida de lo que es;
  - registra las versiones de las herramientas con las que se produjo.

Solo biblioteca estándar. CLI:
    python ml/model_manifest.py verify RUTA/manifest.json [--labels RUTA/labels.json]
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_VERSION = 1
TASKS = {"classify", "detect"}
REQUIRED_KEYS = ("schema_version", "creado", "modelo", "tarea", "entrada", "salida", "etiquetas",
                 "preprocesamiento", "umbrales", "entrenamiento", "evaluacion", "datos", "verificacion",
                 "herramientas", "advertencias")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def labels_sha256(labels: list[str]) -> str:
    return hashlib.sha256("\n".join(labels).encode("utf-8")).hexdigest()


def tool_versions(packages=("ultralytics", "torch", "torchvision", "opencv-python", "numpy", "litert-torch",
                            "ai-edge-litert")) -> dict:
    found = {}
    for name in packages:
        try:
            found[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            found[name] = None
    return found


def build_manifest(*, model_file: Path, task: str, family: str, version: str, labels: list[str],
                   input_spec: dict, output_spec: dict, preprocessing: dict, thresholds: dict,
                   training: dict, evaluation: dict, data: dict, verification: dict, warnings: list[str],
                   tools: dict | None = None) -> dict:
    if task not in TASKS:
        raise ValueError(f"tarea debe ser una de {sorted(TASKS)}")
    if len(set(labels)) != len(labels) or not labels:
        raise ValueError("las etiquetas deben ser únicas y no vacías")
    model_file = Path(model_file)
    return {
        "schema_version": SCHEMA_VERSION,
        "creado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "modelo": {"archivo": model_file.name, "bytes": model_file.stat().st_size,
                   "sha256": sha256_file(model_file), "familia": family, "version": version},
        "tarea": task,
        "entrada": input_spec,
        "salida": output_spec,
        "etiquetas": {"orden": labels, "cantidad": len(labels), "sha256": labels_sha256(labels)},
        "preprocesamiento": preprocessing,
        "umbrales": thresholds,
        "entrenamiento": training,
        "evaluacion": evaluation,
        "datos": data,
        "verificacion": verification,
        "herramientas": tools if tools is not None else tool_versions(),
        "advertencias": warnings,
    }


def write_manifest(manifest: dict, path: Path) -> None:
    Path(path).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def verify_manifest(manifest_path: Path, labels_path: Path | None = None) -> list[str]:
    """Lista de problemas; vacía = el manifiesto describe fielmente los archivos que hay en disco."""
    manifest_path = Path(manifest_path)
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"No se pudo leer {manifest_path}: {error}"]
    problems = [f"Falta la clave '{k}'" for k in REQUIRED_KEYS if k not in manifest]
    if problems:
        return problems
    if manifest["schema_version"] != SCHEMA_VERSION:
        problems.append(f"schema_version {manifest['schema_version']} no soportada (esperada {SCHEMA_VERSION})")
    if manifest["tarea"] not in TASKS:
        problems.append(f"tarea desconocida: {manifest['tarea']}")
    model = manifest_path.parent / manifest["modelo"]["archivo"]
    if not model.is_file():
        problems.append(f"No existe el modelo {model.name} junto al manifiesto")
    else:
        if model.stat().st_size != manifest["modelo"]["bytes"]:
            problems.append("El tamaño del modelo no coincide con el manifiesto")
        if sha256_file(model) != manifest["modelo"]["sha256"]:
            problems.append("El sha256 del modelo no coincide: el archivo cambió después de generar el manifiesto")
    labels = manifest["etiquetas"]["orden"]
    if len(labels) != len(set(labels)) or len(labels) != manifest["etiquetas"]["cantidad"]:
        problems.append("Etiquetas repetidas o 'cantidad' incorrecta")
    if labels_sha256(labels) != manifest["etiquetas"]["sha256"]:
        problems.append("El sha256 de las etiquetas no coincide")
    shape = manifest["salida"].get("forma") or []
    if manifest["tarea"] == "classify" and (not shape or shape[-1] != len(labels)):
        problems.append(f"La salida {shape} no tiene una probabilidad por etiqueta ({len(labels)})")
    if manifest["tarea"] == "detect" and (len(shape) < 2 or shape[1] != 4 + len(labels)):
        problems.append(f"La salida {shape} no es 4 + {len(labels)} canales (caja + una puntuación por clase)")
    if labels_path is not None:
        try:
            expected = json.loads(Path(labels_path).read_text(encoding="utf-8"))["etiquetas"]
        except (OSError, KeyError, json.JSONDecodeError) as error:
            problems.append(f"No se pudo leer {labels_path}: {error}")
        else:
            if expected != labels:
                problems.append("El orden de etiquetas del manifiesto difiere del archivo de etiquetas de la app")
    return problems


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("verify")
    check.add_argument("manifest", type=Path)
    check.add_argument("--labels", type=Path)
    args = parser.parse_args(argv)
    problems = verify_manifest(args.manifest, args.labels)
    if problems:
        print("MANIFIESTO NO VÁLIDO:\n- " + "\n- ".join(problems))
        return 1
    print("Manifiesto válido: coincide con el modelo y las etiquetas en disco.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
