"""Prueba del endpoint dedicado de Ultralytics (gym-detect-object, version-003).

Mismo ejemplo que da Ultralytics Platform, pero sin la clave en el código:

    # PowerShell
    $env:ULTRALYTICS_API_KEY = "ul_..."
    python ml/recognition-yolo/probar_endpoint.py ruta/a/foto.jpg --conf 0.25

La URL se toma de ULTRALYTICS_ENDPOINT_URL o, si no existe, de functions/.env.
Contrato: docs/ultralytics-endpoint.openapi.yaml
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parents[2]


def leer_url() -> str:
    url = os.environ.get("ULTRALYTICS_ENDPOINT_URL", "")
    env = RAIZ / "functions" / ".env"
    if not url and env.exists():
        for linea in env.read_text(encoding="utf-8").splitlines():
            if linea.startswith("ULTRALYTICS_ENDPOINT_URL="):
                url = linea.split("=", 1)[1].strip()
    url = url.rstrip("/")
    if not url.startswith("https://"):
        sys.exit("Falta ULTRALYTICS_ENDPOINT_URL (https) en functions/.env")
    return url if url.endswith("/predict") else f"{url}/predict"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("foto", type=Path)
    p.add_argument("--conf", type=float, default=0.25)
    p.add_argument("--iou", type=float, default=0.5)
    p.add_argument("--imgsz", type=int, default=640)
    a = p.parse_args()

    api_key = os.environ.get("ULTRALYTICS_API_KEY")
    if not api_key:
        sys.exit("Define la variable de entorno ULTRALYTICS_API_KEY.")

    url = leer_url()
    args = {"conf": a.conf, "iou": a.iou, "imgsz": a.imgsz}
    with a.foto.open("rb") as f:
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            data=args,
            files={"file": (a.foto.name, f, "image/jpeg")},
            timeout=90,  # el endpoint escala a cero: el primer arranque tarda
        )

    print(f"HTTP {response.status_code} en {response.elapsed.total_seconds():.1f} s")
    if not response.ok:
        sys.exit(response.text[:500])
    imagen = response.json()["images"][0]
    print("shape:", imagen.get("shape"), "speed:", imagen.get("speed"))
    resultados = sorted(imagen.get("results", []), key=lambda r: -r["confidence"])
    if not resultados:
        print(f"Sin detecciones con conf >= {a.conf}. Prueba con --conf 0.1")
    for r in resultados:
        print(f"  {r['name']:<28} {r['confidence']:.3f}  {r['box']}")


if __name__ == "__main__":
    main()
