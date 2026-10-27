"""Retira logos/banners rojos de fotos promocionales para que el modelo no aprenda la marca.

Uso:
    python scripts/clean_branding.py --clase press-hombro foto1.jpg foto2.jpg

Escribe el resultado en data/real_photos/{clase}/{clase}--{nombre}.jpg.
Reglas (heurística simple, revisar el resultado a ojo):
  - si el 10 % inferior es rojo intenso -> recorta la franja inferior;
  - si hay un círculo rojo arriba a la derecha -> lo difumina con el entorno.
"""
import argparse
from pathlib import Path

import cv2
import numpy as np

from common import REAL_DIR


def clean(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    band = img[int(h * 0.90):]
    red = ((band[..., 2] > 170) & (band[..., 1] < 70) & (band[..., 0] < 70)).mean()
    if red > 0.12:
        img = img[: int(h * 0.925)]
        h = img.shape[0]
    region = img[: int(h * 0.35), int(w * 0.55):]
    mask = ((region[..., 2] > 150) & (region[..., 1] < 80) & (region[..., 0] < 80)).astype(np.uint8)
    if mask.mean() > 0.02:
        mask = cv2.dilate(mask, np.ones((25, 25), np.uint8))
        full = np.zeros(img.shape[:2], np.uint8)
        full[: int(h * 0.35), int(w * 0.55):] = mask
        blurred = cv2.GaussianBlur(
            cv2.inpaint(img, full * 255, 3, cv2.INPAINT_NS), (0, 0), max(8, w // 40)
        )
        soft = cv2.GaussianBlur(full.astype(np.float32), (0, 0), 6)[..., None]
        img = (img * (1 - soft) + blurred * soft).astype(np.uint8)
    return img


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--clase", required=True, help="id de la máquina (clase del catálogo)")
    parser.add_argument("fotos", nargs="+", type=Path)
    args = parser.parse_args()
    out_dir = REAL_DIR / args.clase
    out_dir.mkdir(parents=True, exist_ok=True)
    for foto in args.fotos:
        img = cv2.imread(str(foto))
        if img is None:
            print("No se pudo leer:", foto)
            continue
        destino = out_dir / f"{args.clase}--{foto.stem}.jpg"
        cv2.imwrite(str(destino), clean(img))
        print("OK", destino)


if __name__ == "__main__":
    main()
