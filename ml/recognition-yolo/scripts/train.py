"""Entrena YOLO11n-cls sobre el dataset construido por build_dataset.py.

Uso (desde la raíz de coach-app):
    python ml/recognition-yolo/scripts/build_dataset.py --mode eval
    python ml/recognition-yolo/scripts/train.py --mode eval --name eval-n224
"""
import argparse

from ultralytics import YOLO

import json

from common import (BUILD_DIR, RUNS_DIR, assert_trained_class_order,
                    load_app_labels, load_config, validate_class_directories,
                    write_training_context)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mode", choices=["eval", "final"], required=True)
    parser.add_argument("--name", required=True, help="nombre de la corrida en runs/")
    parser.add_argument("--epochs", type=int, help="sobrescribe config.json")
    parser.add_argument("--device", help="sobrescribe config.json (cpu, 0, ...)")
    args = parser.parse_args()
    cfg = load_config()
    dataset = BUILD_DIR / f"ds_{args.mode}"
    expected_order = validate_class_directories(dataset, load_app_labels())
    model = YOLO(cfg["base_weights"])  # se descarga automáticamente la primera vez
    model.train(
        data=str(dataset),
        epochs=args.epochs or cfg["epochs"],
        imgsz=cfg["imgsz"],
        batch=cfg["batch"],
        device=args.device or cfg["device"],
        workers=cfg["workers"],
        patience=cfg["patience"],
        seed=cfg["seed"],
        project=str(RUNS_DIR),
        name=args.name,
        exist_ok=True,
        plots=True,
        verbose=False,
        **cfg["augment"],
    )
    checkpoint = RUNS_DIR / args.name / "weights" / "best.pt"
    trained = YOLO(str(checkpoint))
    assert_trained_class_order(trained.names, expected_order)
    print(f"Checkpoint validado: {len(expected_order)} clases; class-map.json coincide con los IDs YOLO.")
    stats_file = dataset / "stats.json"
    write_training_context(RUNS_DIR / args.name, cfg, {
        "modo": args.mode, "pesos_iniciales": cfg["base_weights"],
        "dataset": json.loads(stats_file.read_text(encoding="utf-8")) if stats_file.is_file() else None,
    })
    print(f"Contexto de reproducibilidad guardado en {RUNS_DIR / args.name} (training_context.json, environment.lock.txt)")


if __name__ == "__main__":
    main()
