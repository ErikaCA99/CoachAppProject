"""Genera (o verifica) el manifiesto del `.tflite` del clasificador de máquinas.

Uso (desde la raíz de coach-app):
    python ml/recognition-yolo/scripts/make_manifest.py \
        --tflite ml/recognition-yolo/model/machine_recognizer_yolo.tflite --stage final \
        --weights ml/recognition-yolo/weights/yolo11n-cls_machines_v2.pt
    python ml/recognition-yolo/scripts/make_manifest.py --verify ml/recognition-yolo/model/machine_recognizer_yolo.manifest.json

`export_tflite.py` llama a `create_manifest` al terminar, con el resultado real de su verificación.
El manifiesto se guarda junto al modelo como `<nombre>.manifest.json`. Solo biblioteca estándar.
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

from common import PIPE, ROOT, load_app_labels, load_config

sys.path.insert(0, str(ROOT / "ml"))
from model_manifest import build_manifest, sha256_file, tool_versions, verify_manifest, write_manifest  # noqa: E402

APP_SERVICE = ROOT / "src/services/ai/machineRecognition.ts"
REAL_MANIFEST = PIPE / "data/real_photos/manifest.json"
RESULTS = PIPE / "results"


def app_confidence_threshold(service: Path = APP_SERVICE):
    try:
        found = re.search(r"CONFIANZA_MINIMA\s*=\s*([0-9.]+)", service.read_text(encoding="utf-8"))
    except OSError:
        return None
    return float(found.group(1)) if found else None


def _training_summary(run: str, results: Path, cfg: dict) -> dict:
    csv_path = results / run / "results.csv"
    summary = {"corrida": run, "semilla": cfg["seed"], "pesos_iniciales": cfg["base_weights"],
               "imgsz": cfg["imgsz"], "epocas_configuradas": cfg["epochs"], "batch": cfg["batch"],
               "paciencia": cfg["patience"], "aumentos": cfg["augment"]}
    if csv_path.is_file():
        with csv_path.open(encoding="utf-8", newline="") as handle:
            rows = [{k.strip(): v for k, v in row.items()} for row in csv.DictReader(handle)]
        if rows:
            last = rows[-1]
            summary["epocas_ejecutadas"] = len(rows)
            summary["val_final"] = {"top1": float(last["metrics/accuracy_top1"]),
                                    "top5": float(last["metrics/accuracy_top5"])}
            summary["val_nota"] = "Validación sobre fotos de catálogo apartadas; no representa gimnasios reales."
    return summary


def _data_summary(results: Path) -> dict:
    data: dict = {"fuentes": ["fotos de catálogo de proveedores (35 clases)",
                              "Kaggle rifqilukmansyah381/gym-equipment-image (solo eliptica y banco-pecho)",
                              "fotos de gimnasios compartidas por la autora (material promocional)"],
                  "licencias": "POR VERIFICAR (catálogo, Kaggle y fotos promocionales)"}
    per_class = results / "images_per_class_final.json"
    if per_class.is_file():
        counts = json.loads(per_class.read_text(encoding="utf-8"))
        data["fotos_train"] = sum(v["train"] for v in counts.values())
        data["fotos_val"] = sum(v["val"] for v in counts.values())
        data["clases_sin_val"] = sorted(c for c, v in counts.items() if v["val"] == 0)
    if REAL_MANIFEST.is_file():
        photos = json.loads(REAL_MANIFEST.read_text(encoding="utf-8"))["fotos"]
        data["fotos_reales"] = {"total": len(photos),
                                "etiquetas_confirmadas": sum(bool(p.get("etiqueta_confirmada_por_usuario")) for p in photos)}
    return data


def _evaluation_summary(results: Path, eval_summary: Path | None) -> dict:
    if eval_summary and eval_summary.is_file():
        body = json.loads(eval_summary.read_text(encoding="utf-8"))
        return {"conjunto": "fotos reales de gimnasio (data/real_photos) nunca vistas", "fotos": body["fotos"],
                "top1": {"aciertos": body["top1"], "fotos": body["fotos"]},
                "top3": {"aciertos": body["top3"], "fotos": body["fotos"]},
                "por_umbral": body["umbrales"], "fuente": eval_summary.name}
    rows_file = results / "test_real_photos_yolo.json"
    if not rows_file.is_file():
        return {"medido": False}
    rows = json.loads(rows_file.read_text(encoding="utf-8"))
    return {"conjunto": "fotos reales de gimnasio (data/real_photos) nunca vistas", "fotos": len(rows),
            "top1": {"aciertos": sum(r[0] == r[1] for r in rows), "fotos": len(rows)},
            "top3": None, "top3_nota": "No se guardó por foto; ver README (10/32 en esa corrida).",
            "por_umbral": {str(t): {"cobertura": sum(r[2] >= t for r in rows),
                                    "aciertos": sum(r[0] == r[1] for r in rows if r[2] >= t)}
                           for t in (0.5, 0.7, 0.8)},
            "ruido_entre_corridas": "±6 puntos porcentuales (dos semillas)", "fuente": rows_file.name}


def create_manifest(tflite: Path, stage: str, weights: Path | None = None, run: str = "final-n224",
                    verification: dict | None = None, eval_summary: Path | None = None,
                    version: str | None = None, labels: list[str] | None = None,
                    results: Path = RESULTS, app_threshold=None) -> Path:
    if stage not in {"eval", "final"}:
        raise ValueError("stage debe ser 'eval' o 'final'")
    cfg = load_config()
    labels = labels if labels is not None else load_app_labels()
    if version is None:
        mirror = PIPE / "model/labels.json"
        version = json.loads(mirror.read_text(encoding="utf-8")).get("version_modelo", "sin-version") if mirror.is_file() else "sin-version"
    threshold = app_threshold if app_threshold is not None else app_confidence_threshold()
    training = _training_summary(run, results, cfg)
    training["etapa_del_archivo"] = stage
    if weights and weights.is_file():
        training["pesos"] = {"archivo": weights.name, "sha256": sha256_file(weights)}
    context = PIPE / "runs" / run / "training_context.json"
    if context.is_file():
        training["contexto"] = json.loads(context.read_text(encoding="utf-8"))
    warnings = [
        "Reconocimiento ASISTIDO: usar como sugerencia top-3 con confirmación del usuario, no como detección automática.",
        "Las métricas de 'evaluacion' vienen del modelo en etapa 'eval' (sin ver las fotos reales); "
        + ("este archivo es la etapa 'final', que SÍ las vio: no tiene prueba limpia." if stage == "final"
           else "este archivo es de esa misma etapa."),
        "Pocas fotos de prueba (decenas) y de pocos gimnasios: la cifra es orientativa, no una métrica de tesis.",
        "El umbral de la app se calibró para el modelo anterior (MobileNetV2); hay que recalibrarlo con este modelo.",
        "Etiquetas de las fotos reales asignadas visualmente y pendientes de confirmar; licencias de datos por verificar.",
    ]
    manifest = build_manifest(
        model_file=tflite, task="classify", family="yolo11n-cls", version=version, labels=labels,
        input_spec={"forma": [1, 224, 224, 3], "tipo": "float32", "rango": "0..255", "color": "RGB"},
        output_spec={"forma": [1, len(labels)], "tipo": "float32",
                     "significado": "probabilidades softmax (suman 1) en el orden de etiquetas.orden"},
        preprocessing={"recorte": "cuadrado central", "redimensionado": "224x224",
                       "normalizacion": "dentro del modelo (/255)",
                       "referencia_app": "src/services/ai/machineRecognition.ts → prepararEntrada",
                       "nota": "OpenCV solo se usa offline (ml/cv_tools.py); la app no lo ejecuta."},
        thresholds={"confianza_minima_app": threshold, "calibrada_para": "v1.0.0 (MobileNetV2)",
                    "recalibrar": True, "uso_recomendado": "sugerencia top-3 con confirmación"},
        training=training, evaluation=_evaluation_summary(results, eval_summary), data=_data_summary(results),
        verification=verification or {"ejecutada": False, "motivo": "manifiesto generado sin re-exportar el modelo"},
        warnings=warnings,
        tools=tool_versions() if verification else {
            "registradas": False,
            "motivo": "manifiesto creado a partir de archivos existentes; las versiones usadas al entrenar/exportar "
                      "no se guardaron (los siguientes entrenamientos las registran en training_context.json)"})
    destination = tflite.with_suffix(".manifest.json")
    write_manifest(manifest, destination)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tflite", type=Path)
    parser.add_argument("--stage", choices=["eval", "final"])
    parser.add_argument("--weights", type=Path)
    parser.add_argument("--run", default="final-n224")
    parser.add_argument("--eval-summary", type=Path, help="JSON de evaluate.py --summary")
    parser.add_argument("--version")
    parser.add_argument("--verify", type=Path, help="verifica un manifiesto existente en lugar de crear uno")
    args = parser.parse_args()
    if args.verify:
        problems = verify_manifest(args.verify, ROOT / "ml/results/recognition/labels.json")
        print("Manifiesto válido." if not problems else "NO VÁLIDO:\n- " + "\n- ".join(problems))
        return 1 if problems else 0
    if not args.tflite or not args.stage:
        parser.error("--tflite y --stage son obligatorios para crear el manifiesto")
    path = create_manifest(args.tflite, args.stage, args.weights, args.run, None, args.eval_summary, args.version)
    print(f"Manifiesto escrito: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
