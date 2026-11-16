"""Construye un piloto reproducible desde una selección de cajas revisadas."""
import argparse
import json
import math
import shutil
from pathlib import Path
from types import SimpleNamespace

from pipeline import build, write_json
from training import inspect_dataset

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, default=ROOT / "pilots/prensa-v1.json")
    parser.add_argument("--source", type=Path, default=ROOT / "dataset")
    parser.add_argument("--dataset", type=Path, default=ROOT / "dataset/pilots/prensa-v1")
    args = parser.parse_args()
    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    manifest = json.loads((args.source / "manifest.json").read_text(encoding="utf-8"))
    originals = {record["imagen"]: record for record in manifest["imagenes"]}
    names, groups = set(), {}
    for item in spec["imagenes"]:
        name = item["imagen"]
        if Path(name).name != name or name in names:
            raise ValueError(f"Imagen inválida o repetida: {name}")
        names.add(name)
        original = originals[name]
        if original["sha256"] != item["sha256_origen"] or not (args.source / "images" / name).is_file():
            raise ValueError(f"No coincide el original o falta la copia: {name}")
        if item["split"] not in {"train", "val", "test"} or not item["grupo"]:
            raise ValueError(f"Grupo o partición inválida: {name}")
        group = item["grupo"]
        if group in groups and groups[group] != item["split"]:
            raise ValueError(f"Grupo compartido entre particiones: {group}")
        groups[group] = item["split"]
        for box in item["cajas_xyxy_normalizadas"]:
            x1, y1, x2, y2 = box
            if not all(math.isfinite(v) for v in box) or not (0 <= x1 < x2 <= 1 and 0 <= y1 < y2 <= 1):
                raise ValueError(f"Caja fuera de la imagen: {name}")
    args.dataset.mkdir(parents=True, exist_ok=False)
    for directory in ["images", "labels"]:
        (args.dataset / directory).mkdir()
    records, plan = [], {}
    for item in spec["imagenes"]:
        name = item["imagen"]
        original = originals[name]
        shutil.copy2(args.source / "images" / name, args.dataset / "images" / name)
        rows = []
        for x1, y1, x2, y2 in item["cajas_xyxy_normalizadas"]:
            rows.append(f"0 {(x1+x2)/2:.8f} {(y1+y2)/2:.8f} {x2-x1:.8f} {y2-y1:.8f}")
        (args.dataset / "labels" / Path(name).with_suffix(".txt")).write_text(
            "\n".join(rows) + ("\n" if rows else ""), encoding="utf-8")
        records.append(original | {"clase_sugerida": 0,
                                    "clase_catalogo_origen": manifest["names"][original["clase_sugerida"]]})
        plan[name] = {"grupo": item["grupo"], "split": item["split"]}
    write_json(args.dataset / "manifest.json", {"names": [spec["clase"]], "imagenes": records,
                                                "errores": [], "piloto": spec["version"],
                                                "limitacion": spec["limitacion"]})
    write_json(args.dataset / "split-plan.json", plan)
    (args.dataset / "classes.txt").write_text(spec["clase"] + "\n", encoding="utf-8")
    shutil.copy2(args.spec, args.dataset / "annotation-review.json")
    build(SimpleNamespace(dataset=args.dataset, split_plan=args.dataset / "split-plan.json"))
    report = inspect_dataset(args.dataset)
    write_json(args.dataset / "audit.json", report)
    if not report["listo"]:
        raise ValueError(report["errores"])
    print("Piloto listo:", args.dataset)


if __name__ == "__main__":
    main()
