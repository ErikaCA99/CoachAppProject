"""Construye el dataset de clasificación YOLO (carpetas train/val/test por clase).

Modos:
  eval   Las fotos reales de gimnasios van a `test` (el modelo no las ve al entrenar).
         Sirve para MEDIR. Es la única cifra honesta del pipeline.
  final  Las fotos reales entran a `train` (repetidas `real_photo_repeats` veces).
         Sirve para el modelo que se entrega; no queda prueba limpia.

Fuentes: catálogo (train/val 85/15), externas de Kaggle (solo para completar hasta
`cap_per_class` fotos de entrenamiento) y fotos reales de gimnasios.

Buenas prácticas aplicadas (OpenCV, `ml/cv_tools.py`):
  - El split train/val del catálogo se hace por GRUPOS de fotos casi idénticas (hash perceptual, también
    espejadas): un mismo ejemplar no aparece a la vez en train y en val.
  - Las clases con menos de `min_images_for_val` fotos (o un solo grupo) no pueden tener val propio.
    Política `small_class_policy` de config.json:
      "augmented_val_copy"  val recibe UNA copia con aumentos fotométricos de una foto de train. Mantiene
                            las 35 carpetas en val (exigencia de `validate_class_directories`), pero esa
                            clase NO mide generalización: queda marcada en stats.json (`val_sintetica`).
      "error"               aborta, como hacía la versión anterior.
  - stats.json lista las fotos con problemas de calidad (borrosas, oscuras, diminutas); no se excluyen.
"""
import argparse
import json
import random
import shutil

import numpy as np

import cv_tools
from common import (BUILD_DIR, CATALOG_DIR, EXTERNAL_DIR, IMAGE_EXTS, REAL_DIR, class_from_filename,
                    load_app_labels, load_config, write_class_map)


def put(out, split, clase, src, prefix=""):
    dest = out / split / clase
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest / f"{prefix}{src.name}")


def group_photos(photos, threshold):
    """Agrupa fotos casi idénticas; las ilegibles quedan solas (se reportan aparte)."""
    hashes, unreadable = {}, []
    for photo in photos:
        image = cv_tools.read_image(photo)
        if image is None:
            unreadable.append(photo.name)
            continue
        hashes[photo.name] = cv_tools.dhash(image)
    by_name = {p.name: p for p in photos}
    groups = [[by_name[n] for n in g] for g in cv_tools.group_near_duplicates(hashes, threshold)]
    groups += [[by_name[n]] for n in unreadable]
    return groups, unreadable


def split_groups(groups, n_target, rng):
    """Toma grupos completos para val hasta alcanzar n_target fotos, dejando siempre algo en train."""
    order = groups[:]
    rng.shuffle(order)
    val, taken = [], 0
    if len(order) >= 2 and n_target:
        for group in order:
            if taken >= n_target or len(val) == len(order) - 1:
                break
            val.append(group)
            taken += len(group)
    val_ids = {id(g) for g in val}
    return [p for g in val for p in g], [p for g in order if id(g) not in val_ids for p in g]


def augmented_val_copy(out, clase, train_photos, seed):
    """Crea la única foto de val de una clase pequeña: copia fotométrica de su primera foto de train."""
    source = sorted(train_photos, key=lambda p: p.name)[0]
    image = cv_tools.read_image(source)
    if image is None:
        raise ValueError(f"No se pudo leer {source} para crear la copia de validación de {clase}")
    rng = np.random.default_rng(seed + sum(map(ord, clase)))
    dest = out / "val" / clase
    dest.mkdir(parents=True, exist_ok=True)
    cv_tools.write_jpeg(dest / f"valaug_{source.stem}.jpg", cv_tools.augment_photometric(image, rng))
    return source.name


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mode", choices=["eval", "final"], required=True)
    args = parser.parse_args()
    cfg = load_config()
    app_labels = load_app_labels()
    rng = random.Random(cfg["seed"])
    random.seed(cfg["seed"])
    out = BUILD_DIR / f"ds_{args.mode}"
    shutil.rmtree(out, ignore_errors=True)
    if not CATALOG_DIR.is_dir():
        raise ValueError(f"No existe la carpeta de catálogo: {CATALOG_DIR}")

    catalog: dict[str, list] = {}
    ignored = []
    for f in sorted(CATALOG_DIR.iterdir()):
        if f.is_file() and f.suffix.lower() in IMAGE_EXTS:
            clase = class_from_filename(f.name)
            if clase in app_labels:
                catalog.setdefault(clase, []).append(f)
            else:
                ignored.append(f.name)  # p. ej. fotos sueltas sin clase del catálogo
    missing = sorted(set(app_labels) - set(catalog))
    unknown_external = sorted(set(cfg["external_classes"]) - set(app_labels))
    if missing or unknown_external:
        raise ValueError(f"Clases de fotos distintas del contrato de la app: faltan={missing}, externas_desconocidas={unknown_external}")
    external = {
        c: sorted(p for p in (EXTERNAL_DIR / c).glob("*") if p.suffix.lower() in IMAGE_EXTS)
        for c in cfg["external_classes"] if (EXTERNAL_DIR / c).is_dir()
    }
    unknown_real = sorted({p.parent.name for p in REAL_DIR.glob("*/*") if p.suffix.lower() in IMAGE_EXTS} - set(app_labels))
    if unknown_real:
        raise ValueError(f"Clases de fotos reales no existentes en labels.json: {unknown_real}")

    stats, synthetic_val, unreadable_all, low_quality = {}, {}, [], []
    for clase in sorted(catalog):
        fotos = catalog[clase][:]
        groups, unreadable = group_photos(fotos, cfg["near_duplicate_bits"])
        unreadable_all += unreadable
        n_target = 0 if len(fotos) < cfg["min_images_for_val"] else max(1, round(len(fotos) * cfg["val_fraction"]))
        val, train = split_groups(groups, n_target, rng)
        extra = external.get(clase, [])[:]
        random.shuffle(extra)
        train += extra[: max(0, cfg["cap_per_class"] - len(train))]
        for p in train:
            put(out, "train", clase, p)
        for p in val:
            put(out, "val", clase, p)
        stats[clase] = {"train": len(train), "val": len(val), "grupos": len(groups)}
        if not val:
            if cfg["small_class_policy"] != "augmented_val_copy":
                raise ValueError(f"La clase {clase} no tiene originales independientes suficientes para una validación limpia; no se copiará train a val.")
            origin = augmented_val_copy(out, clase, train, cfg["seed"])
            stats[clase]["val"], stats[clase]["val_sintetica"] = 1, origin
            synthetic_val[clase] = origin
        for p in train + val:
            image = cv_tools.read_image(p)
            if image is not None:
                reasons = cv_tools.image_quality(image)["motivos"]
                if reasons:
                    low_quality.append({"clase": clase, "foto": p.name, "motivos": reasons})

    for foto in sorted(REAL_DIR.glob("*/*")):
        if foto.suffix.lower() not in IMAGE_EXTS:
            continue
        clase = foto.parent.name
        if args.mode == "final":
            for r in range(cfg["real_photo_repeats"]):
                put(out, "train", clase, foto, f"r{r}_")
            stats[clase]["train"] += cfg["real_photo_repeats"]
        else:
            put(out, "test", clase, foto)

    # Este JSON deja auditado el mapeo entre los IDs de clase YOLO y la app.
    class_order = write_class_map(out, app_labels)
    report = {"clases": stats, "val_sintetica": synthetic_val, "ignoradas_sin_clase": ignored,
              "ilegibles": unreadable_all, "calidad_baja": low_quality,
              "umbral_casi_duplicados_bits": cfg["near_duplicate_bits"]}
    (out / "stats.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    count = lambda split: sum(1 for _ in (out / split).glob("*/*")) if (out / split).is_dir() else 0
    print(f"{args.mode}: train={count('train')} val={count('val')} test={count('test')} clases={len(class_order)} (orden YOLO verificado)  ->  {out}")
    if synthetic_val:
        print(f"AVISO: {len(synthetic_val)} clase(s) con val sintética (sin fotos independientes): {sorted(synthetic_val)}")
    if ignored:
        print(f"AVISO: {len(ignored)} foto(s) sin clase del catálogo omitidas: {ignored}")
    if low_quality:
        print(f"AVISO: {len(low_quality)} foto(s) con problemas de calidad (ver stats.json → calidad_baja)")


if __name__ == "__main__":
    main()
