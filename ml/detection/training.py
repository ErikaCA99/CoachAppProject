"""Configuración y comprobaciones de entrenamiento; sin importar PyTorch al revisar datos."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = ROOT / "train_config.json"


def parse_batch(value):
    try:
        number = float(value)
    except (ValueError, TypeError) as error:
        raise argparse.ArgumentTypeError("batch debe ser entero positivo, -1 o fracción entre 0 y 1") from error
    if not math.isfinite(number) or not (number == -1 or 0 < number < 1 or number >= 1 and number.is_integer()):
        raise argparse.ArgumentTypeError("batch debe ser entero positivo, -1 o fracción entre 0 y 1")
    return int(number) if number.is_integer() else number


def training_options(args):
    defaults = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    supplied = json.loads(args.config.read_text(encoding="utf-8"))
    if not isinstance(supplied, dict) or set(supplied) - set(defaults):
        raise ValueError("La configuración contiene claves desconocidas; usa train_config.json como referencia")
    options = defaults | supplied
    for key in ["epochs", "patience", "batch", "imgsz", "workers", "seed", "optimizer", "lr0", "close_mosaic"]:
        value = getattr(args, key, None)
        if value is not None:
            options[key] = value
    for key, default in defaults.items():
        value = options[key]
        if isinstance(default, bool):
            if not isinstance(value, bool):
                raise ValueError(f"{key} debe ser booleano")
        elif isinstance(default, (int, float)):
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"{key} debe ser un número finito")
    options["batch"] = parse_batch(options["batch"])
    for key in ["epochs", "patience", "imgsz", "workers", "seed", "close_mosaic", "save_period"]:
        minimum = 1 if key in {"epochs", "patience", "imgsz", "save_period"} else 0
        if not isinstance(options[key], int) or options[key] < minimum:
            raise ValueError(f"{key} debe ser entero >= {minimum}")
    if options["imgsz"] % 32:
        raise ValueError("imgsz debe ser múltiplo de 32 (p. ej. 640)")
    if options["close_mosaic"] >= options["epochs"]:
        raise ValueError("close_mosaic debe ser menor que epochs; en una prueba corta usa --close-mosaic 0")
    if options["optimizer"] not in {"AdamW", "SGD"}:
        raise ValueError("Usa AdamW o SGD explícito para que lr0 tenga efecto")
    if not 0 < options["lr0"] <= 1 or not 0 < options["lrf"] <= 1:
        raise ValueError("lr0 y lrf deben estar entre 0 (excluido) y 1")
    for key in ["weight_decay", "hsv_h", "hsv_s", "hsv_v", "translate", "scale", "fliplr", "flipud", "mosaic", "mixup"]:
        if not 0 <= options[key] <= 1:
            raise ValueError(f"{key} debe estar entre 0 y 1")
    if not 0 <= options["degrees"] <= 180 or not 0 <= options["shear"] < 90:
        raise ValueError("Rotación o shear fuera de rango")
    if not 0 <= options["perspective"] <= .001 or options["warmup_epochs"] < 0:
        raise ValueError("Perspectiva o warmup fuera de rango")
    if not options["val"] or not options["save"]:
        raise ValueError("Este flujo requiere val=true y save=true para seleccionar best.pt")
    auto_batch = options["batch"] == -1 or 0 < options["batch"] < 1
    if auto_batch and not str(args.device).isdecimal():
        raise ValueError("AutoBatch requiere una sola GPU CUDA explícita (--device 0); en CPU usa --batch 8 o 4")
    return options


def read_classes(path, count):
    classes = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        values = line.split()
        try:
            if len(values) != 5:
                raise ValueError("se esperan cinco campos")
            cls = int(values[0])
            x, y, w, h = map(float, values[1:])
            valid = (0 <= cls < count and all(math.isfinite(v) for v in [x, y, w, h])
                     and w > 0 and h > 0 and x - w/2 >= -1e-6 and y - h/2 >= -1e-6
                     and x + w/2 <= 1 + 1e-6 and y + h/2 <= 1 + 1e-6)
            if not valid:
                raise ValueError("clase o caja fuera de rango")
        except ValueError as error:
            raise ValueError(f"{path.name}, línea {number}: {error}") from error
        classes.append(cls)
    return classes


def inspect_dataset(dataset):
    """Comprueba cajas y particiones guardadas; no sustituye revisión visual humana."""
    errors, warnings = [], []
    manifest_path = dataset / "manifest.json"
    if not manifest_path.is_file():
        return {"listo": False, "errores": ["Falta manifest.json; ejecuta prepare"], "avisos": []}
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    names, records = manifest["names"], manifest["imagenes"]
    counts = [0] * len(names)
    missing = 0
    missing_images = 0
    for record in records:
        counts[record["clase_sugerida"]] += 1
        if not (dataset / "images" / record["imagen"]).is_file():
            missing_images += 1
        label = dataset / "labels" / Path(record["imagen"]).with_suffix(".txt")
        if not label.is_file():
            missing += 1
        else:
            try:
                read_classes(label, len(names))
            except ValueError as error:
                errors.append(str(error))
    if missing:
        errors.append(f"Faltan anotaciones en {missing} imágenes; ejecuta annotate")
    if missing_images:
        errors.append(f"Faltan {missing_images} archivos de imagen originales del dataset")
    sparse = {name: counts[i] for i, name in enumerate(names) if counts[i] < 3}
    if sparse:
        errors.append(f"Clases con menos de 3 originales para train/val/test: {sparse}")
    if manifest.get("errores"):
        warnings.append("Revisar las incidencias del manifest (archivos ilegibles o duplicados entre clases)")
    warnings.append("Revisar fotos reales y similares por sesión/ejemplar; los aumentos no aportan escenas independientes")
    partitions_path = dataset / "partitions.json"
    summary = {}
    signatures = {"manifest.json": hashlib.sha256(manifest_path.read_bytes()).hexdigest()}
    if not (dataset / "data.yaml").is_file() or not partitions_path.is_file():
        errors.append("Faltan data.yaml o partitions.json; completa anotaciones y ejecuta build")
    else:
        signatures["data.yaml"] = hashlib.sha256((dataset / "data.yaml").read_bytes()).hexdigest()
        signatures["partitions.json"] = hashlib.sha256(partitions_path.read_bytes()).hexdigest()
        partitions = json.loads(partitions_path.read_text(encoding="utf-8"))
        seen, groups, seen_files = {}, {}, set()
        fingerprint = hashlib.sha256()
        all_grouped = True
        for split in ["train", "val", "test"]:
            images = partitions.get(split, [])
            expected_images = {record["imagen"] for record in images}
            actual_images = {p.name for p in (dataset / "split/images" / split).rglob("*") if p.is_file()}
            expected_labels = {str(Path(name).with_suffix(".txt")) for name in expected_images}
            actual_labels = {p.name for p in (dataset / "split/labels" / split).rglob("*.txt")}
            if actual_images != expected_images or actual_labels != expected_labels:
                errors.append(f"Archivos extra o faltantes respecto a partitions.json en {split}")
            boxes = [0] * len(names)
            negatives = 0
            if not images:
                errors.append(f"Partición vacía: {split}")
            for record in images:
                filename = record["imagen"]
                if Path(filename).name != filename:
                    errors.append(f"Nombre de imagen inválido: {filename}")
                    continue
                if filename in seen_files:
                    errors.append(f"Imagen repetida en particiones: {filename}")
                seen_files.add(filename)
                group = record.get("grupo")
                all_grouped = all_grouped and bool(group)
                if group:
                    if group in groups and groups[group] != split:
                        errors.append(f"Sesión/ejemplar compartido entre particiones: {group}")
                    groups[group] = split
                image_path = dataset / "split/images" / split / filename
                label_path = dataset / "split/labels" / split / Path(filename).with_suffix(".txt")
                if not image_path.is_file() or not label_path.is_file():
                    errors.append(f"Falta imagen o etiqueta en {split}: {filename}")
                    continue
                digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
                if digest in seen and seen[digest] != split:
                    errors.append(f"Foto duplicada entre particiones: {filename}")
                seen[digest] = split
                label_bytes = label_path.read_bytes()
                fingerprint.update(f"{split}/{filename}:{digest}:".encode() + label_bytes)
                original_label = dataset / "labels" / label_path.name
                if original_label.is_file() and original_label.read_bytes() != label_bytes:
                    errors.append(f"Etiqueta modificada después de build: {filename}; reconstruye las particiones")
                try:
                    classes = read_classes(label_path, len(names))
                    negatives += not classes
                    for cls in classes:
                        boxes[cls] += 1
                except ValueError as error:
                    errors.append(str(error))
            absent = [name for i, name in enumerate(names) if boxes[i] == 0]
            if absent:
                errors.append(f"Clases sin cajas en {split}: {', '.join(absent)}")
            summary[split] = {"imagenes": len(images), "negativas": negatives,
                              "cajas_por_clase": dict(zip(names, boxes))}
        if seen_files != {record["imagen"] for record in records}:
            errors.append("Las particiones no contienen exactamente las imágenes del manifest")
        if not all_grouped:
            warnings.append("Split por foto: no certifica separación por sesión/ejemplar. Usa build --split-plan para evaluación real")
        signatures["split_content"] = fingerprint.hexdigest()
    return {"listo": not errors, "imagenes": len(records), "imagenes_faltantes": missing_images,
            "anotaciones_pendientes": missing,
            "fotos_por_clase": dict(zip(names, counts)), "particiones": summary,
            "errores": errors, "avisos": warnings, "sha256": signatures}
