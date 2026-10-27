"""Mide top-1/top-3 en las fotos de `test` del dataset `eval` (fotos reales que el modelo no vio).

Uso:
    # YOLO (pesos .pt)
    python scripts/evaluate.py --kind yolo --model runs/eval-n224/weights/best.pt
    # Modelo actual de la app (.tflite, entrada 0..255, orden de clases de la app)
    python scripts/evaluate.py --kind tflite --model ../../assets/models/machine_recognizer.tflite

OJO: no usar el modelo `final` con este script: se entrenó con esas fotos y la cifra saldría inflada.
"""
import argparse
import collections
import json
from pathlib import Path

import numpy as np
from PIL import Image

from common import BUILD_DIR, load_app_labels


def preprocess_tflite(path: Path) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    s = min(w, h)
    img = img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((224, 224))
    return np.asarray(img, dtype=np.float32)[None]  # [1,224,224,3] RGB 0..255


def predictor(kind: str, model_path: str, imgsz: int):
    if kind == "yolo":
        from ultralytics import YOLO
        model = YOLO(model_path)
        def run(path):
            r = model.predict(str(path), imgsz=imgsz, device="cpu", verbose=False)[0]
            return [model.names[int(k)] for k in r.probs.top5[:3]], float(r.probs.top1conf)
        return run
    from ai_edge_litert.interpreter import Interpreter
    labels = load_app_labels()
    it = Interpreter(model_path=model_path)
    it.allocate_tensors()
    inp, out = it.get_input_details()[0], it.get_output_details()[0]
    def run(path):
        it.set_tensor(inp["index"], preprocess_tflite(path))
        it.invoke()
        p = it.get_tensor(out["index"])[0]
        return [labels[int(k)] for k in np.argsort(-p)[:3]], float(p.max())
    return run


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--kind", choices=["yolo", "tflite"], required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--dataset", default=str(BUILD_DIR / "ds_eval"))
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--out", help="JSON con una fila [real, predicha, confianza] por foto")
    parser.add_argument("--summary", help="JSON con top-1/top-3, aciertos por clase y cobertura por umbral (lo lee make_manifest.py)")
    args = parser.parse_args()
    run = predictor(args.kind, args.model, args.imgsz)
    rows, per = [], collections.defaultdict(lambda: [0, 0])
    top1 = top3 = 0
    for photo in sorted(Path(args.dataset, "test").glob("*/*")):
        real = photo.parent.name
        top, conf = run(photo)
        top1 += top[0] == real
        top3 += real in top
        per[real][0] += top[0] == real
        per[real][1] += 1
        rows.append([real, top[0], round(conf, 2)])
    n = len(rows)
    print(f"{args.kind}: top-1 {top1}/{n} = {100*top1/n:.1f} %   top-3 {top3}/{n} = {100*top3/n:.1f} %")
    for clase, (a, b) in sorted(per.items()):
        print(f"  {clase:28s} {a}/{b}")
    for t in (0.5, 0.7, 0.8):
        sel = [r for r in rows if r[2] >= t]
        prec = f"{100*sum(r[0]==r[1] for r in sel)/len(sel):.0f} %" if sel else "-"
        print(f"  confianza >= {t}: cobertura {len(sel)}/{n}, precisión {prec}")
    if args.out:
        Path(args.out).write_text(json.dumps(rows), encoding="utf-8")
    if args.summary:
        summary = {"tipo": args.kind, "modelo": Path(args.model).name, "fotos": n, "top1": top1, "top3": top3,
                   "por_clase": {c: {"aciertos": a, "fotos": b} for c, (a, b) in sorted(per.items())},
                   "umbrales": {str(t): {"cobertura": sum(r[2] >= t for r in rows),
                                         "aciertos": sum(r[0] == r[1] for r in rows if r[2] >= t)}
                                for t in (0.5, 0.7, 0.8)}}
        Path(args.summary).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
