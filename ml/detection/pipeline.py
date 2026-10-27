"""Dataset YOLO, anotación manual, entrenamiento y cámara para coach-app."""
from __future__ import annotations

import argparse
import hashlib
import json
import importlib.metadata
import platform
import random
import re
import shutil
import sys
import time
from pathlib import Path

from training import DEFAULT_CONFIG, inspect_dataset, parse_batch, read_classes, training_options

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))  # ml/ → cv_tools, model_manifest
LABELS = ROOT.parent / "results/recognition/labels.json"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def prepare(args):
    from PIL import Image, ImageOps

    names = json.loads(LABELS.read_text(encoding="utf-8"))["etiquetas"]
    if not args.source.is_dir():
        raise ValueError(f"No existe la carpeta: {args.source}")
    args.dataset.mkdir(parents=True, exist_ok=False)
    images = args.dataset / "images"
    images.mkdir()
    (args.dataset / "labels").mkdir()
    records, errors, seen = [], [], {}
    for folder in sorted(args.source.iterdir()):
        name = re.sub(r"^\d+-", "", folder.name)
        if not folder.is_dir() or name not in names:
            continue
        # Solo fotos; se excluyen explícitamente los GIFs y sus subcarpetas.
        for source in sorted(folder.rglob("*")):
            if source.suffix.lower() not in EXTENSIONS or "gifs" in source.relative_to(folder).parts:
                continue
            try:
                with Image.open(source) as original:
                    if getattr(original, "n_frames", 1) > 1:
                        continue
                    image = ImageOps.exif_transpose(original).convert("RGBA")
                    bg = Image.new("RGBA", image.size, "white")
                    image = Image.alpha_composite(bg, image).convert("RGB")
                    digest = hashlib.sha256(str(image.size).encode() + image.tobytes()).hexdigest()
                    if digest in seen:
                        if seen[digest] != name:
                            errors.append({"archivo": str(source), "error": "Duplicado entre clases"})
                        continue
                    seen[digest] = name
                    filename = f"{name}--{digest[:20]}.jpg"
                    image.save(images / filename, quality=95)
                    records.append({"imagen": filename, "origen": str(source),
                                    "clase_sugerida": names.index(name), "sha256": digest})
            except (OSError, ValueError) as error:
                errors.append({"archivo": str(source), "error": str(error)})
    write_json(args.dataset / "manifest.json", {"names": names, "imagenes": records, "errores": errors})
    (args.dataset / "classes.txt").write_text("\n".join(names) + "\n", encoding="utf-8")
    print(f"Preparadas {len(records)} fotos únicas. Incidencias: {len(errors)}. Faltan cajas manuales.")


def annotate(args):
    import cv2

    manifest = json.loads((args.dataset / "manifest.json").read_text(encoding="utf-8"))
    names = manifest["names"]
    print("Marca todas las máquinas. Enter confirma cada caja; Esc termina las cajas.")
    print("Después: s guarda, n confirma imagen negativa, cualquier otra tecla omite. q sale.")
    for record in manifest["imagenes"]:
        label = args.dataset / "labels" / Path(record["imagen"]).with_suffix(".txt")
        if label.exists():
            continue
        image = cv2.imread(str(args.dataset / "images" / record["imagen"]))
        if image is None:
            raise ValueError(f"Imagen ilegible: {record['imagen']}")
        scale = min(1, 1000 / max(image.shape[:2]))
        preview = cv2.resize(image, None, fx=scale, fy=scale)
        boxes = cv2.selectROIs("Anotar maquinas", preview, showCrosshair=True)
        rows = []
        for x, y, w, h in boxes:
            print("Clases:", dict(enumerate(names)))
            raw = input(f"Clase de la caja (Enter = {record['clase_sugerida']}): ").strip()
            cls = int(raw) if raw else record["clase_sugerida"]
            if not 0 <= cls < len(names):
                raise ValueError("Clase fuera del catálogo")
            height, width = preview.shape[:2]
            rows.append(f"{cls} {(x+w/2)/width:.8f} {(y+h/2)/height:.8f} {w/width:.8f} {h/height:.8f}")
        print(f"{record['imagen']}: {len(rows)} cajas. s/n/omitir/q")
        key = cv2.waitKey(0) & 0xFF
        if key == ord("q"):
            break
        if (key == ord("s") and rows) or (key == ord("n") and not rows):
            label.write_text("\n".join(rows) + ("\n" if rows else ""), encoding="utf-8")
    cv2.destroyAllWindows()


def build(args):
    manifest = json.loads((args.dataset / "manifest.json").read_text(encoding="utf-8"))
    names, samples = manifest["names"], manifest["imagenes"]
    groups = {i: [] for i in range(len(names))}
    for record in samples:
        label = args.dataset / "labels" / Path(record["imagen"]).with_suffix(".txt")
        if not label.exists():
            raise ValueError(f"Falta anotar {record['imagen']}; no se asume fondo automáticamente")
        read_classes(label, len(names))
        groups[record["clase_sugerida"]].append(record)
    output = args.dataset / "split"
    if output.exists():
        raise ValueError("split ya existe; usa un dataset nuevo para no mezclar particiones")
    rng = random.Random(42)
    partitions = {"train": [], "val": [], "test": []}
    if args.split_plan:
        plan = json.loads(args.split_plan.read_text(encoding="utf-8"))
        if set(plan) != {record["imagen"] for record in samples}:
            raise ValueError("El split-plan debe asignar exactamente todas las imágenes del manifest")
        assigned_groups = {}
        for record in samples:
            entry = plan[record["imagen"]]
            group, split = entry.get("grupo"), entry.get("split")
            if not isinstance(group, str) or not group.strip() or split not in partitions:
                raise ValueError("Cada imagen necesita grupo de sesión/ejemplar y split train/val/test")
            if group in assigned_groups and assigned_groups[group] != split:
                raise ValueError(f"El grupo {group} cruza particiones")
            assigned_groups[group] = split
            partitions[split].append(record | {"grupo": group})
    else:
        for group in groups.values():
            if len(group) < 3:
                raise ValueError("Se requieren al menos 3 fotos originales por clase para separar train/val/test")
            rng.shuffle(group)
            n = max(1, round(len(group) * .15))
            partitions["val"].extend(group[:n])
            partitions["test"].extend(group[n:2*n])
            partitions["train"].extend(group[2*n:])
    coverage = {}
    for split, records in partitions.items():
        classes = set()
        for record in records:
            label = args.dataset / "labels" / Path(record["imagen"]).with_suffix(".txt")
            classes.update(int(line.split()[0]) for line in label.read_text().splitlines())
        coverage[split] = [names[i] for i in range(len(names)) if i not in classes]
    if any(coverage.values()):
        raise ValueError(f"Clases sin cajas en particiones; añade fotos/anotaciones: {coverage}")
    for split, records in partitions.items():
        for kind in ["images", "labels"]:
            (output / kind / split).mkdir(parents=True)
        for record in records:
            filename = record["imagen"]
            shutil.copy2(args.dataset / "images" / filename, output / "images" / split / filename)
            label = Path(filename).with_suffix(".txt")
            shutil.copy2(args.dataset / "labels" / label, output / "labels" / split / label)
    config = f"path: {json.dumps(output.resolve().as_posix())}\ntrain: images/train\nval: images/val\ntest: images/test\nnames: {json.dumps(names)}\n"
    (args.dataset / "data.yaml").write_text(config, encoding="utf-8")
    write_json(args.dataset / "partitions.json", partitions)
    print({split: len(records) for split, records in partitions.items()})


def audit(args):
    report = inspect_dataset(args.dataset)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["listo"]:
        raise SystemExit(2)


def require_dataset(dataset, report):
    if not report["listo"]:
        raise ValueError("Dataset no listo:\n- " + "\n- ".join(report["errores"]))
    # PyYAML llega con Ultralytics. Se importa después de comprobar los datos.
    import yaml

    config = yaml.safe_load((dataset / "data.yaml").read_text(encoding="utf-8"))
    expected_names = json.loads((dataset / "manifest.json").read_text(encoding="utf-8"))["names"]
    names = config.get("names")
    if isinstance(names, dict):
        names = [names.get(i) for i in range(len(expected_names))]
    if names != expected_names or Path(config.get("path", "")).resolve() != (dataset / "split").resolve():
        raise ValueError("data.yaml no coincide con el catálogo/ruta auditados; vuelve a generar con build")
    if any(config.get(split) != f"images/{split}" for split in ["train", "val", "test"]):
        raise ValueError("data.yaml apunta a particiones distintas de las auditadas")


def save_metrics(metrics, model, destination, split):
    per_class = {}
    for i, class_id in enumerate(metrics.box.ap_class_index):
        precision, recall, ap50, ap = metrics.box.class_result(i)
        per_class[model.names[int(class_id)]] = {
            "precision": float(precision), "recall": float(recall),
            "map50": float(ap50), "map50_95": float(ap),
        }
    write_json(destination, {"split": split, "metricas": {k: float(v) for k, v in metrics.results_dict.items()},
                             "por_clase": per_class})


def resolve_data(args):
    """(ruta del data.yaml, informe de auditoría, nombres de clase) según el flujo elegido.

    Con `--data-yaml` se usa la carpeta construida por `yolo-folder` (split sin fuga, estilo del video);
    sin él, el flujo anterior prepare → annotate → build sobre `--dataset`.
    """
    data_yaml = getattr(args, "data_yaml", None)
    if data_yaml:
        from yolo_folder import verify_yolo_folder

        data_yaml = Path(data_yaml).resolve()
        report = verify_yolo_folder(data_yaml.parent)
        return data_yaml, report, report.get("nombres", [])
    report = inspect_dataset(args.dataset)
    return (args.dataset / "data.yaml").resolve(), report, None


def train(args):
    options = training_options(args)
    data_path, report, _ = resolve_data(args)
    if args.dry_run:
        print(json.dumps({"modelo": args.model, "device": args.device, "data": str(data_path),
                          "configuracion": options, "dataset": report}, ensure_ascii=False, indent=2))
        return
    if getattr(args, "data_yaml", None):
        if not report["listo"]:
            raise ValueError("Dataset no listo:\n- " + "\n- ".join(report["errores"]))
    else:
        require_dataset(args.dataset, report)
    from ultralytics import YOLO

    if not re.fullmatch(r"[A-Za-z0-9_-]+", args.name):
        raise ValueError("name debe contener solo letras, números, guiones y guiones bajos")
    model = YOLO(args.model)
    if model.task != "detect":
        raise ValueError("Se requiere un modelo de detección")

    def record_context(trainer):
        destination = Path(trainer.save_dir)
        write_json(destination / "training_context.json", {
            "modelo_inicial": args.model, "python": platform.python_version(),
            "ultralytics": importlib.metadata.version("ultralytics"),
            "torch": importlib.metadata.version("torch"),
            "device": str(trainer.device), "batch_efectivo": trainer.batch_size,
            "configuracion_solicitada": options, "dataset": report,
        })
        packages = sorted(f"{d.metadata['Name']}=={d.version}" for d in importlib.metadata.distributions())
        (destination / "environment.lock.txt").write_text("\n".join(packages) + "\n", encoding="utf-8")

    model.add_callback("on_train_start", record_context)
    model.train(data=str(data_path), device=args.device,
                project=str(ROOT / "runs"), name=args.name, exist_ok=False, **options)
    best = Path(model.trainer.best)
    detector = YOLO(str(best))
    # Comparar experimentos en val. Test solo se abre con evaluate --split test.
    metrics = detector.val(data=str(data_path), split="val",
                           device=args.device, imgsz=options["imgsz"],
                           batch=model.trainer.batch_size, workers=options["workers"],
                           project=str(best.parent.parent), name="validation", plots=True)
    save_metrics(metrics, detector, best.parent.parent / "validation.json", "val")


def evaluate(args):
    if not Path(args.model).is_file():
        raise ValueError("Indica un best.pt entrenado")
    data_path, report, folder_names = resolve_data(args)
    if getattr(args, "data_yaml", None):
        if not report["listo"]:
            raise ValueError("Dataset no listo:\n- " + "\n- ".join(report["errores"]))
        names = folder_names
    else:
        require_dataset(args.dataset, report)
        names = json.loads((args.dataset / "manifest.json").read_text(encoding="utf-8"))["names"]
    from ultralytics import YOLO

    model = YOLO(args.model)
    if model.task != "detect" or [model.names[i] for i in range(len(model.names))] != names:
        raise ValueError("El modelo no coincide con las clases del dataset")
    output = {}

    def capture_output(validator):
        output["directory"] = Path(validator.save_dir)

    model.add_callback("on_val_end", capture_output)
    metrics = model.val(data=str(data_path), split=args.split,
                        device=args.device, imgsz=args.imgsz, batch=args.batch, workers=0,
                        project=str(ROOT / "runs"), name=f"evaluacion-{args.split}", plots=True)
    save_metrics(metrics, model, output["directory"] / "evaluation.json", args.split)


def yolo_folder_command(args):
    """Construye (o solo verifica) la carpeta YOLO sin fuga + data.yaml + dataset-manifest.json."""
    from yolo_folder import BuildIncomplete, build_yolo_folder, verify_yolo_folder

    if args.check_only:
        report = verify_yolo_folder(args.output)
    else:
        try:
            report = build_yolo_folder(args.source, args.output, seed=args.seed, dup_threshold=args.dup_threshold,
                                       augment_copies=args.augment_copies, classes_file=args.classes_file,
                                       max_seconds=args.max_seconds)
        except BuildIncomplete as error:
            print(error)
            raise SystemExit(3)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["listo"]:
        raise SystemExit(2)


def export_detector(args):
    """Exporta a TFLite y escribe `<modelo>.manifest.json` (contrato, etiquetas, sha256, métricas de val, versiones)."""
    from ultralytics import YOLO
    from model_manifest import build_manifest, tool_versions, write_manifest

    model = YOLO(args.model)
    if model.task != "detect":
        raise ValueError("Se requiere un modelo de detección")
    exported = Path(model.export(format="tflite", imgsz=args.imgsz, nms=False))
    tflite = exported if exported.suffix == ".tflite" else sorted(exported.glob("*float32.tflite"))[0]
    labels = [model.names[i] for i in range(len(model.names))]
    anchors = sum((args.imgsz // stride) ** 2 for stride in (8, 16, 32))
    run_dir = Path(args.model).resolve().parents[1]
    validation = run_dir / "validation.json"
    context = run_dir / "training_context.json"
    verification = {"ejecutada": False, "motivo": "La forma de salida es la esperada para YOLOv8 sin NMS; no se "
                    "ejecutó el .tflite. Compruébalo con un intérprete antes de integrarlo en la app."}
    try:
        from ai_edge_litert.interpreter import Interpreter

        interpreter = Interpreter(model_path=str(tflite))
        interpreter.allocate_tensors()
        shapes = {"entrada": interpreter.get_input_details()[0]["shape"].tolist(),
                  "salida": interpreter.get_output_details()[0]["shape"].tolist()}
        verification = {"ejecutada": True, "formas_reales": shapes,
                        "coincide_con_esperado": shapes["salida"][1:] == [4 + len(labels), anchors]}
    except ImportError:
        pass
    manifest = build_manifest(
        model_file=tflite, task="detect", family=Path(args.model).stem, version=run_dir.name, labels=labels,
        input_spec={"forma": [1, args.imgsz, args.imgsz, 3], "tipo": "float32", "rango": "0..1", "color": "RGB"},
        output_spec={"forma": [1, 4 + len(labels), anchors], "tipo": "float32",
                     "significado": "sin NMS: 4 valores de caja + una puntuación por clase por candidato; "
                                    "la app debe aplicar umbral y NMS"},
        preprocessing={"redimensionado": f"letterbox a {args.imgsz}x{args.imgsz} (proporción conservada)",
                       "normalizacion": "/255 antes de la red"},
        thresholds={"confianza": "sin calibrar: elegir con val (TRAINING.md)", "iou_nms": 0.7},
        training=json.loads(context.read_text(encoding="utf-8")) if context.is_file() else {"registrado": False},
        evaluation={"val": json.loads(validation.read_text(encoding="utf-8"))} if validation.is_file()
        else {"medido": False},
        data={"carpeta": "ver 'dataset' dentro de entrenamiento"},
        verification=verification, tools=tool_versions(),
        warnings=["Etiquetas por clase solo son tan fiables como las cajas; revisar annotation-review.",
                  "Las métricas son de la partición val; test se abre una sola vez al final."])
    write_manifest(manifest, tflite.with_suffix(".manifest.json"))
    print(f"Exportado: {tflite} | manifiesto: {tflite.with_suffix('.manifest.json')}")


def realtime(args):
    import cv2
    from cv_tools import sharpness_ok
    from ultralytics import YOLO

    if not Path(args.model).is_file():
        raise ValueError("Indica los pesos best.pt entrenados con las máquinas")
    model = YOLO(args.model)
    if model.task != "detect":
        raise ValueError("El modelo no es detector")
    source = int(args.source) if args.source.isdecimal() else args.source
    capture = cv2.VideoCapture(source)
    if not capture.isOpened():
        raise ValueError("No se pudo abrir la cámara/video")
    try:
        with args.output.open("x", encoding="utf-8") as output:
            frame_id = 0
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                if args.min_sharpness and not sharpness_ok(frame, args.min_sharpness):
                    # Fotograma movido/desenfocado: inferir ahí genera cajas inestables y falsos positivos.
                    output.write(json.dumps({"frame": frame_id, "ancho": frame.shape[1], "alto": frame.shape[0],
                                             "omitido": "borroso", "objetos": []}) + "\n")
                    skipped = frame.copy()
                    cv2.putText(skipped, "Imagen borrosa: sin inferencia", (15, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, .7, (0, 0, 255), 2)
                    cv2.imshow("coach-app - deteccion (q: salir)", skipped)
                    frame_id += 1
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                    continue
                start = time.perf_counter()
                result = model.predict(frame, conf=args.confidence, device=args.device, verbose=False)[0]
                elapsed = time.perf_counter() - start
                objects = []
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    objects.append({"maquinaId": result.names[int(box.cls.item())],
                                    "confianza": float(box.conf.item()), "caja_xyxy_px": [x1, y1, x2, y2],
                                    "centro_px": [(x1+x2)/2, (y1+y2)/2]})
                output.write(json.dumps({"frame": frame_id, "ancho": frame.shape[1], "alto": frame.shape[0],
                                         "inferencia_ms": elapsed*1000, "objetos": objects}) + "\n")
                preview = result.plot()
                cv2.putText(preview, f"Inferencia: {elapsed*1000:.0f} ms", (15, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, .7, (0, 255, 0), 2)
                cv2.imshow("coach-app - deteccion (q: salir)", preview)
                frame_id += 1
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    finally:
        capture.release()
        cv2.destroyAllWindows()


def create_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for command in ["prepare", "annotate", "build", "audit", "train", "evaluate", "realtime", "export"]:
        p = sub.add_parser(command)
        p.add_argument("--dataset", type=Path, default=ROOT / "dataset/v8-35")
        if command == "prepare":
            p.add_argument("--source", type=Path, required=True)
        if command == "build":
            p.add_argument("--split-plan", type=Path, help="JSON imagen → {grupo, split}, para separar sesiones/ejemplares")
        if command in {"train", "evaluate", "realtime", "export"}:
            model_options = {"choices": [f"yolov8{size}.pt" for size in "nsmlx"]} if command == "train" else {}
            p.add_argument("--model", required=command != "train", default="yolov8n.pt", **model_options)
            p.add_argument("--device", default="cpu")
        if command == "train":
            p.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
            p.add_argument("--epochs", type=int, help="Máximo de épocas; configuración inicial: 150")
            p.add_argument("--patience", type=int, help="Épocas sin mejora antes de parar; inicial: 30")
            p.add_argument("--batch", type=parse_batch, help="Entero positivo, -1 o fracción CUDA (p. ej. 0.7)")
            p.add_argument("--imgsz", type=int)
            p.add_argument("--workers", type=int)
            p.add_argument("--seed", type=int)
            p.add_argument("--optimizer", choices=["AdamW", "SGD"])
            p.add_argument("--lr0", type=float)
            p.add_argument("--close-mosaic", type=int)
            p.add_argument("--name", default="maquinas")
            p.add_argument("--dry-run", action="store_true", help="Muestra parámetros y estado del dataset sin entrenar ni descargar pesos")
        if command in {"evaluate", "export"}:
            p.add_argument("--imgsz", type=int, default=640)
        if command == "evaluate":
            p.add_argument("--split", choices=["val", "test"], default="val")
            p.add_argument("--batch", type=int, default=8)
        if command in {"train", "evaluate"}:
            p.add_argument("--data-yaml", type=Path,
                           help="data.yaml de una carpeta creada con yolo-folder (ignora --dataset)")
        if command == "realtime":
            p.add_argument("--source", default="0")
            p.add_argument("--confidence", type=float, default=.5)
            p.add_argument("--min-sharpness", type=float, default=15.0,
                           help="Varianza mínima del Laplaciano para inferir (0 desactiva el filtro)")
            p.add_argument("--output", type=Path, default=ROOT / "detections.jsonl")
    folder = sub.add_parser("yolo-folder", help="Carpeta YOLO train/val/test sin fuga + data.yaml + manifiesto")
    folder.add_argument("--source", type=Path, default=ROOT / "dataset/data",
                        help="carpeta con images/ y labels/ (con o sin subcarpeta train)")
    folder.add_argument("--output", type=Path, default=ROOT / "dataset/yolo-v8")
    folder.add_argument("--seed", type=int, default=42)
    folder.add_argument("--dup-threshold", type=int, default=6,
                        help="bits de diferencia del hash perceptual para considerar casi-duplicadas dos fotos")
    folder.add_argument("--augment-copies", type=int, default=0,
                        help="copias con aumentos fotométricos (OpenCV) por foto de train; las cajas no cambian")
    folder.add_argument("--classes-file", type=Path, help="classes.txt (por defecto el de --source)")
    folder.add_argument("--max-seconds", type=float,
                        help="presupuesto de tiempo: si se agota, guarda el avance (caché de hashes) y sale con código 3; "
                             "repite el mismo comando para continuar")
    folder.add_argument("--check-only", action="store_true", help="solo verificar --output")
    return parser


def main():
    args = create_parser().parse_args()
    if args.command == "yolo-folder":
        yolo_folder_command(args)
    elif args.command == "export":
        export_detector(args)
    else:
        globals()[args.command](args)


if __name__ == "__main__":
    main()
