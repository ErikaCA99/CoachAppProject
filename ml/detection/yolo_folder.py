"""Carpeta YOLO lista para entrenar (images|labels × train|val|test + data.yaml) SIN fuga entre particiones.

Reproduce el paso "Preparación del Dataset" del video de YOLOv5 con las buenas prácticas de YOLOv8:
  - el split se hace por GRUPOS de fotos casi idénticas (hash perceptual de OpenCV, también espejadas),
    nunca foto a foto: así una misma máquina no aparece en train y en val;
  - todas las clases con >= 3 grupos tienen al menos una foto en val y otra en test;
  - `data.yaml` NO lleva `path:` porque Ultralytics resuelve un `path` relativo contra su carpeta de
    datasets (no contra el YAML); sin `path`, usa la carpeta donde está el YAML y funciona igual en
    Windows, Linux y Colab;
  - `dataset-manifest.json` registra sha256 de cada foto/etiqueta, grupo, partición y advertencias,
    y `verify_yolo_folder` detecta cualquier cambio posterior.

Uso:
    python ml/detection/pipeline.py yolo-folder --source ml/detection/dataset/data --output ml/detection/dataset/yolo-v8
    python ml/detection/pipeline.py yolo-folder --output ml/detection/dataset/yolo-v8 --check-only
"""
from __future__ import annotations

import hashlib
import json
import random
import re
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # ml/ → cv_tools
from training import read_classes  # noqa: E402  (solo biblioteca estándar)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
SPLITS = ("train", "val", "test")
SCHEMA_VERSION = 1
# `clase--<hash>`, `clase-02` o `clase` → nombre de clase del catálogo
_STEM = re.compile(r"^(?P<clase>.+?)(?:--[0-9a-f]{8,}|-\d{1,3})?$")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stratum_of(filename: str, known: set[str]) -> str:
    """Clase del catálogo deducida del nombre de archivo; 'sin-clase' si no es una clase conocida."""
    match = _STEM.match(Path(filename).stem)
    name = match.group("clase") if match else Path(filename).stem
    return name if name in known else "sin-clase"


def assign_splits(items: list[dict], hashes: dict[str, int], seed: int, ratios: tuple[float, float, float],
                  dup_threshold: int) -> tuple[dict[str, str], dict[str, str], list[str]]:
    """Devuelve (split por imagen, grupo por imagen, advertencias). Grupos completos van a una sola partición."""
    from cv_tools import group_near_duplicates

    warnings: list[str] = []
    stratum = {item["name"]: item["stratum"] for item in items}
    groups = group_near_duplicates(hashes, dup_threshold)
    by_stratum: dict[str, list[list[str]]] = {}
    for group in groups:
        votes: dict[str, int] = {}
        for name in group:
            votes[stratum[name]] = votes.get(stratum[name], 0) + 1
        owner = sorted(votes.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
        by_stratum.setdefault(owner, []).append(group)

    rng = random.Random(seed)
    split_of: dict[str, str] = {}
    group_of: dict[str, str] = {}
    for owner in sorted(by_stratum):
        owned = by_stratum[owner]
        rng.shuffle(owned)
        total = sum(len(g) for g in owned)
        counts = dict.fromkeys(SPLITS, 0)
        targets = {s: r * total for s, r in zip(SPLITS, ratios)}
        plan: list[tuple[list[str], str]] = []
        if len(owned) >= 3:
            plan += [(owned[0], "val"), (owned[1], "test")]
            rest = owned[2:]
            for s_group, s_name in plan:
                counts[s_name] += len(s_group)
            for group in rest:
                choice = max(SPLITS, key=lambda s: (targets[s] - counts[s], s == "train"))
                counts[choice] += len(group)
                plan.append((group, choice))
        else:
            plan = [(g, "train") for g in owned]
            warnings.append(f"Clase '{owner}': solo {len(owned)} grupo(s) independiente(s); va entera a train "
                            "(sin val/test propios).")
        for group, split in plan:
            label = f"g{len(group_of) + 1:04d}"
            for name in group:
                split_of[name] = split
                group_of[name] = label
    return split_of, group_of, warnings


def _resolve_dirs(source: Path) -> tuple[Path, Path]:
    images = source / "images" / "train" if (source / "images" / "train").is_dir() else source / "images"
    labels = source / "labels" / "train" if (source / "labels" / "train").is_dir() else source / "labels"
    if not images.is_dir() or not labels.is_dir():
        raise ValueError(f"{source} debe contener images/ y labels/ (con o sin subcarpeta train)")
    return images, labels


def _class_names(label_files: list[Path], classes_file: Path | None) -> tuple[list[str], list[str]]:
    ids: set[int] = set()
    for path in label_files:
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                ids.add(int(line.split()[0]))
    warnings: list[str] = []
    file_names = [n.strip() for n in classes_file.read_text(encoding="utf-8").splitlines() if n.strip()] \
        if classes_file and classes_file.is_file() else []
    if ids and ids != {0} and file_names and max(ids) < len(file_names):
        return file_names, warnings
    if ids <= {0}:
        warnings.append("TODAS las etiquetas son clase 0: se construye un detector de UNA clase ('maquina'). "
                        "Para distinguir las 35 máquinas hacen falta cajas con su clase correcta (annotate) "
                        "o un segundo paso de clasificación sobre el recorte (ml/recognition-yolo).")
        return ["maquina"], warnings
    warnings.append("Hay varias clases pero no se encontró classes.txt compatible; se usan nombres genéricos.")
    return [f"clase-{i}" for i in range(max(ids) + 1)], warnings


def _write_yaml(path: Path, names: list[str]) -> None:
    body = "\n".join(f"  {i}: {json.dumps(n, ensure_ascii=False)}" for i, n in enumerate(names))
    path.write_text(
        "# Generado por ml/detection/pipeline.py yolo-folder. No editar a mano: se regenera.\n"
        "# Sin `path:` a propósito: Ultralytics usa la carpeta de este archivo como raíz.\n"
        "train: images/train\nval: images/val\ntest: images/test\n"
        f"nc: {len(names)}\nnames:\n{body}\n", encoding="utf-8")


def read_data_yaml(path: Path) -> dict:
    """Lee data.yaml con PyYAML si está; si no, con un lector mínimo del formato que genera este módulo."""
    text = path.read_text(encoding="utf-8")
    try:
        import yaml
        return yaml.safe_load(text) or {}
    except ImportError:
        data: dict = {}
        names: dict[int, str] = {}
        in_names = False
        for raw in text.splitlines():
            line = raw.split("#", 1)[0].rstrip()
            if not line.strip():
                continue
            if in_names and raw.startswith(" "):
                key, _, value = line.strip().partition(":")
                names[int(key)] = json.loads(value.strip())
                continue
            in_names = False
            key, _, value = line.partition(":")
            if key.strip() == "names":
                in_names = True
            else:
                data[key.strip()] = int(value) if value.strip().isdigit() else value.strip()
        data["names"] = names
        return data


class BuildIncomplete(RuntimeError):
    """Se agotó --max-seconds; el avance quedó en el caché y basta repetir el mismo comando."""


def _features(files: list[Path], cache_path: Path, deadline: float | None) -> dict:
    """Hash perceptual y motivos de calidad por foto, con caché reanudable (clave: tamaño + mtime).

    Decodificar fotos de 5000x3333 px cuesta ~0,3 s cada una; el caché evita repetirlo y permite
    trabajar en equipos o sandboxes con límite de tiempo por ejecución.
    """
    import cv_tools

    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.is_file() else {}
    done = 0
    last_save = time.monotonic()

    def save() -> None:
        cache_path.write_text(json.dumps(cache), encoding="utf-8")

    for file in files:
        stat = file.stat()
        key = f"{stat.st_size}:{stat.st_mtime_ns}"
        if cache.get(file.name, {}).get("key") == key:
            continue
        if deadline is not None and time.monotonic() > deadline:
            save()
            raise BuildIncomplete(f"Tiempo agotado tras {done} fotos nuevas; repite el mismo comando para continuar "
                                  f"({sum(1 for f in files if cache.get(f.name, {}).get('key'))}/{len(files)} listas).")
        image = cv_tools.read_image(file)
        if image is None:
            cache[file.name] = {"key": key, "ilegible": True}
        else:
            cache[file.name] = {"key": key, "dhash": cv_tools.dhash(image),
                                "calidad": cv_tools.image_quality(image)["motivos"]}
        done += 1
        if done % 25 == 0 or time.monotonic() - last_save > 8:  # guardado por tiempo: sobrevive a un corte
            save()
            last_save = time.monotonic()
    save()
    return cache


def build_yolo_folder(source: Path, output: Path, *, seed: int = 42, ratios=(0.70, 0.15, 0.15),
                      dup_threshold: int = 6, augment_copies: int = 0, classes_file: Path | None = None,
                      max_seconds: float | None = None, cache_path: Path | None = None) -> dict:
    import numpy as np
    import cv_tools

    deadline = time.monotonic() + max_seconds if max_seconds else None
    images_dir, labels_dir = _resolve_dirs(source)
    if output.exists() and any(output.iterdir()):
        raise ValueError(f"{output} ya existe y no está vacío; usa otra carpeta para no mezclar particiones")
    files = sorted(p for p in images_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
    cache_file = cache_path or output.parent / f".{output.name}-features.json"
    features = _features(files, cache_file, deadline)  # lo más lento primero: su avance queda en el caché
    errors: list[str] = []
    label_of: dict[str, Path] = {}
    for image in files:
        label = labels_dir / f"{image.stem}.txt"
        if label.is_file():
            label_of[image.name] = label
        else:
            errors.append(f"Sin etiqueta: {image.name} (un TXT vacío significa 'sin máquinas'; ausente = sin anotar)")
    if errors:
        raise ValueError("\n".join(errors[:20]) + ("\n..." if len(errors) > 20 else ""))
    classes_path = classes_file or (source / "classes.txt")
    names, warnings = _class_names(list(label_of.values()), classes_path)
    invalid: dict[str, str] = {}
    for name, label in label_of.items():
        try:
            read_classes(label, len(names))  # cajas válidas y dentro de la imagen
        except ValueError as error:
            invalid[name] = str(error)
    if invalid:
        warnings.append(f"Etiquetas inválidas: {len(invalid)} foto(s) excluidas del dataset (se conservan sin tocar en "
                        f"el origen; corrígelas con `annotate` y vuelve a construir): {invalid}")
    known = {n.strip() for n in classes_path.read_text(encoding="utf-8").splitlines()} if classes_path.is_file() else set()

    unreadable = sorted(n for n, f in features.items() if f.get("ilegible"))
    if unreadable:
        warnings.append(f"Imágenes ilegibles excluidas: {unreadable}")
    items = [{"name": f.name, "stratum": stratum_of(f.name, known)} for f in files
             if not features[f.name].get("ilegible") and f.name not in invalid]
    hashes = {i["name"]: features[i["name"]]["dhash"] for i in items}

    split_of, group_of, split_warnings = assign_splits(items, hashes, seed, ratios, dup_threshold)
    warnings += split_warnings
    for split in SPLITS:
        for kind in ("images", "labels"):
            (output / kind / split).mkdir(parents=True)

    records = []
    stratum_by_name = {i["name"]: i["stratum"] for i in items}
    for file in files:
        if file.name not in split_of:
            continue
        split = split_of[file.name]
        label = label_of[file.name]
        shutil.copy2(file, output / "images" / split / file.name)
        shutil.copy2(label, output / "labels" / split / label.name)
        records.append({"imagen": file.name, "split": split, "grupo": group_of[file.name],
                        "estrato": stratum_by_name[file.name], "sha256": sha256_file(file),
                        "sha256_etiqueta": sha256_file(label), "calidad": features[file.name]["calidad"],
                        "origen": False})
    augmented = 0
    if augment_copies > 0:
        for index, record in enumerate(r for r in list(records) if r["split"] == "train"):
            name = record["imagen"]
            image = cv_tools.read_image(images_dir / name)  # se relee: no se guardan decodificadas (hay fotos de 50 MB)
            height, width = image.shape[:2]
            if max(height, width) > 1280:  # YOLO entrena a 640: copias más grandes solo pesan
                scale = 1280 / max(height, width)
                image = cv2_resize(image, scale)
            for copy_id in range(augment_copies):
                rng = np.random.default_rng(seed * 100_003 + index * 101 + copy_id)
                aug = cv_tools.augment_photometric(image, rng)
                stem = f"aug{copy_id}_{Path(name).stem}"
                target = output / "images" / "train" / f"{stem}.jpg"
                cv_tools.write_jpeg(target, aug)
                label_target = output / "labels" / "train" / f"{stem}.txt"
                shutil.copy2(label_of[name], label_target)
                records.append({"imagen": target.name, "split": "train", "grupo": record["grupo"],
                                "estrato": record["estrato"], "sha256": sha256_file(target),
                                "sha256_etiqueta": sha256_file(label_target), "calidad": [],
                                "origen": f"aumento fotométrico de {name}"})
                augmented += 1

    _write_yaml(output / "data.yaml", names)
    low_quality = sorted(r["imagen"] for r in records if r["calidad"])
    if low_quality:
        warnings.append(f"{len(low_quality)} imagen(es) con motivos de calidad (ver 'calidad' en el manifiesto); "
                        "se conservan, revisa si conviene retirarlas.")
    warnings.append("Fotos de catálogo (fondo limpio, ángulos de producto): val/test miden generalización a OTRAS "
                    "fotos de catálogo, no a gimnasios reales. Las cajas actuales son aproximadas.")
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "creado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "semilla": seed, "proporciones": dict(zip(SPLITS, ratios)), "umbral_casi_duplicados_bits": dup_threshold,
        "origen": source.as_posix(), "aumentos_copias_por_foto_train": augment_copies,
        "nc": len(names), "names": names,
        "conteo": {s: sum(1 for r in records if r["split"] == s) for s in SPLITS},
        "originales": {s: sum(1 for r in records if r["split"] == s and not r["origen"]) for s in SPLITS},
        "aumentadas": augmented, "grupos": len(set(group_of.values())),
        "advertencias": warnings, "archivos": records,
    }
    (output / "dataset-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    report = verify_yolo_folder(output)
    if not report["listo"]:
        raise ValueError("La carpeta generada no pasa la verificación:\n- " + "\n- ".join(report["errores"]))
    return report


def cv2_resize(image, scale: float):
    import cv2

    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)


def verify_yolo_folder(folder: Path) -> dict:
    """Comprueba estructura, etiquetas, duplicados entre particiones, fuga por grupos y cambios desde el build."""
    errors: list[str] = []
    warnings: list[str] = []
    yaml_path, manifest_path = folder / "data.yaml", folder / "dataset-manifest.json"
    if not yaml_path.is_file():
        return {"listo": False, "errores": ["Falta data.yaml"], "avisos": [], "resumen": {}}
    config = read_data_yaml(yaml_path)
    names = config.get("names")
    names = [names[i] for i in sorted(names)] if isinstance(names, dict) else list(names or [])
    if not names or config.get("nc") not in (None, len(names)):
        errors.append("data.yaml: 'names' vacío o 'nc' no coincide con la cantidad de nombres")
    if "path" in config:
        warnings.append("data.yaml define 'path': un valor relativo se resuelve contra la carpeta de datasets de "
                        "Ultralytics, no contra este archivo. Quítalo para que funcione igual en cualquier equipo.")
    for split in ("train", "val"):
        if config.get(split) != f"images/{split}":
            errors.append(f"data.yaml: '{split}' debe ser images/{split}")
    seen: dict[str, str] = {}
    summary: dict[str, dict] = {}
    for split in SPLITS:
        image_dir, label_dir = folder / "images" / split, folder / "labels" / split
        images = sorted(p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTS) if image_dir.is_dir() else []
        if not images:
            errors.append(f"Partición vacía o ausente: {split}")
        boxes = [0] * max(len(names), 1)
        negatives = 0
        for image in images:
            label = label_dir / f"{image.stem}.txt"
            if not label.is_file():
                errors.append(f"Sin etiqueta en {split}: {image.name}")
                continue
            digest = sha256_file(image)
            if digest in seen and seen[digest] != split:
                errors.append(f"Foto duplicada entre {seen[digest]} y {split}: {image.name}")
            seen[digest] = split
            try:
                classes = read_classes(label, len(names))
            except ValueError as error:
                errors.append(str(error))
                continue
            negatives += not classes
            for c in classes:
                boxes[c] += 1
        summary[split] = {"imagenes": len(images), "negativas": negatives, "cajas_por_clase": dict(zip(names, boxes))}
        if images and sum(boxes) == 0 and split != "train":
            errors.append(f"La partición {split} no tiene ninguna caja; no sirve para medir")
        if len(names) > 1:
            absent = [n for n, b in zip(names, boxes) if b == 0]
            if absent and split != "train":
                warnings.append(f"Clases sin cajas en {split}: {', '.join(absent)}")
    if not manifest_path.is_file():
        warnings.append("Falta dataset-manifest.json: no se puede comprobar fuga por grupos ni cambios posteriores")
    else:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        group_split: dict[str, str] = {}
        for record in manifest["archivos"]:
            split = record["split"]
            if group_split.setdefault(record["grupo"], split) != split:
                errors.append(f"Grupo {record['grupo']} repartido entre particiones ({record['imagen']})")
            image = folder / "images" / split / record["imagen"]
            label = folder / "labels" / split / f"{Path(record['imagen']).stem}.txt"
            if not image.is_file() or not label.is_file():
                errors.append(f"Falta archivo del manifiesto: {split}/{record['imagen']}")
            elif sha256_file(image) != record["sha256"] or sha256_file(label) != record["sha256_etiqueta"]:
                errors.append(f"Modificado después de build: {split}/{record['imagen']}")
        warnings += manifest.get("advertencias", [])
    return {"listo": not errors, "errores": errors, "avisos": warnings, "nombres": names, "resumen": summary}
