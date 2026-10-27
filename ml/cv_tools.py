"""Utilidades OpenCV compartidas por los pipelines de visión (`ml/detection`, `ml/recognition-yolo`).

USO EXCLUSIVAMENTE OFFLINE (preparar datos y evaluar en el PC / Colab). La app móvil no ejecuta
OpenCV: todo lo que se haga aquí al entrenar debe ser algo que el modelo aprenda a tolerar, nunca un
paso que la app tendría que repetir. La única excepción es `center_square_crop_resize`, que replica
el recorte de `src/services/ai/machineRecognition.ts` para evaluar con la misma entrada que la app.

Qué aporta cada función a la calidad del modelo:
  - `image_quality`        detecta fotos borrosas, oscuras o diminutas antes de entrenar con ellas.
  - `dhash` / `group_near_duplicates`
                           agrupan fotos casi idénticas (recortes, espejos, re-compresiones) para que
                           NO queden repartidas entre train y val/test (fuga de datos que infla métricas).
  - `augment_photometric`  aumentos que no mueven píxeles (luz, sombra, desenfoque, ruido, JPEG, CLAHE):
                           sirven igual para clasificación y detección porque las cajas no cambian.
  - `sharpness_ok`         filtro de fotogramas borrosos para la cámara en vivo del PC.

CLI:
    python ml/cv_tools.py audit RUTA_FOTOS [--out informe.json] [--dup-threshold 6]
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# --------------------------------------------------------------------------------------
# Lectura / escritura robustas (rutas con tildes o espacios en Windows, WebP, etc.)
# --------------------------------------------------------------------------------------
def read_image(path) -> np.ndarray | None:
    """BGR uint8, o None si el archivo no se puede decodificar. Respeta la orientación EXIF."""
    try:
        data = np.fromfile(str(path), dtype=np.uint8)
    except OSError:
        return None
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_COLOR)  # IMREAD_COLOR aplica la orientación EXIF


def write_jpeg(path, image: np.ndarray, quality: int = 95) -> None:
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    if not ok:
        raise ValueError(f"No se pudo codificar {path}")
    buffer.tofile(str(path))


# --------------------------------------------------------------------------------------
# Calidad de imagen
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class QualityThresholds:
    min_side: int = 224          # px del lado menor; por debajo se pierde detalle al llegar a 224/640
    min_sharpness: float = 20.0  # varianza del Laplaciano (gris, lado mayor normalizado a 512 px)
    min_brightness: float = 40.0 # media de gris (0..255)
    max_bright_flat: float = 240.0  # media muy alta Y contraste bajo = imagen lavada
    min_contrast: float = 8.0    # desviación estándar de gris; menos = imagen casi uniforme


def image_quality(image: np.ndarray, thresholds: QualityThresholds = QualityThresholds()) -> dict:
    """Métricas objetivas y motivos de rechazo. No decide por sí sola: el llamador elige qué hacer."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    scale = 512 / max(height, width)
    small = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else gray
    sharpness = float(cv2.Laplacian(small, cv2.CV_64F).var())
    brightness = float(gray.mean())
    contrast = float(gray.std())
    reasons = []
    if min(height, width) < thresholds.min_side:
        reasons.append("baja_resolucion")
    if contrast < thresholds.min_contrast:
        reasons.append("sin_contenido")
    elif sharpness < thresholds.min_sharpness:
        reasons.append("borrosa")
    if brightness < thresholds.min_brightness:
        reasons.append("muy_oscura")
    if brightness > thresholds.max_bright_flat and contrast < 25:
        reasons.append("lavada")
    return {"ancho": width, "alto": height, "nitidez": round(sharpness, 2),
            "brillo": round(brightness, 1), "contraste": round(contrast, 1),
            "motivos": reasons, "ok": not reasons}


def sharpness_ok(frame: np.ndarray, min_sharpness: float = 20.0) -> bool:
    """Filtro rápido para la cámara en vivo: descarta fotogramas movidos antes de inferir."""
    return image_quality(frame, QualityThresholds(min_sharpness=min_sharpness))["nitidez"] >= min_sharpness


# --------------------------------------------------------------------------------------
# Casi-duplicados
# --------------------------------------------------------------------------------------
def dhash(image: np.ndarray, hash_size: int = 8) -> int:
    """Hash de diferencias invariante al espejo horizontal (toma el menor de imagen y espejo)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    def one(g: np.ndarray) -> int:
        small = cv2.resize(g, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
        bits = (small[:, 1:] > small[:, :-1]).flatten()
        return int("".join("1" if b else "0" for b in bits), 2)

    return min(one(gray), one(cv2.flip(gray, 1)))


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def group_near_duplicates(hashes: dict[str, int], threshold: int = 6) -> list[list[str]]:
    """Agrupa claves cuyos hashes difieren en <= `threshold` bits (union-find, O(n²), n ~ cientos)."""
    keys = sorted(hashes)
    parent = {k: k for k in keys}

    def find(k: str) -> str:
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if hamming(hashes[a], hashes[b]) <= threshold:
                parent[find(a)] = find(b)
    groups: dict[str, list[str]] = {}
    for k in keys:
        groups.setdefault(find(k), []).append(k)
    return sorted(groups.values(), key=lambda g: (-len(g), g[0]))


# --------------------------------------------------------------------------------------
# Recorte idéntico al de la app
# --------------------------------------------------------------------------------------
def center_square_crop_resize(image: np.ndarray, size: int = 224) -> np.ndarray:
    """Recorte cuadrado central + resize, como `prepararEntrada` en machineRecognition.ts.

    Devuelve BGR. Para el modelo hay que pasar a RGB (`[..., ::-1]`) y a float32 0..255.
    La app redimensiona con expo-image-manipulator; INTER_AREA es la aproximación más cercana a
    una reducción de calidad, pero no es bit a bit idéntica: no usar para comparar al píxel.
    """
    height, width = image.shape[:2]
    side = min(height, width)
    x0, y0 = (width - side) // 2, (height - side) // 2
    crop = image[y0:y0 + side, x0:x0 + side]
    interpolation = cv2.INTER_AREA if side >= size else cv2.INTER_LINEAR
    return cv2.resize(crop, (size, size), interpolation=interpolation)


# --------------------------------------------------------------------------------------
# Aumentos fotométricos (no mueven píxeles: las cajas YOLO siguen siendo válidas)
# --------------------------------------------------------------------------------------
def _gamma(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    gamma = float(np.exp(rng.uniform(-0.35, 0.35) * strength))
    table = (np.linspace(0, 1, 256) ** gamma * 255).astype(np.uint8)
    return cv2.LUT(image, table)


def _brightness_contrast(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    alpha = 1 + rng.uniform(-0.25, 0.25) * strength
    beta = rng.uniform(-25, 25) * strength
    return cv2.convertScaleAbs(image, alpha=alpha, beta=beta)


def _color_temperature(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    gains = 1 + rng.uniform(-0.08, 0.08, size=3) * strength  # B, G, R
    return np.clip(image.astype(np.float32) * gains, 0, 255).astype(np.uint8)


def _shadow(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    height, width = image.shape[:2]
    angle = rng.uniform(0, 2 * np.pi)
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    ramp = (xs / max(width - 1, 1) - 0.5) * np.cos(angle) + (ys / max(height - 1, 1) - 0.5) * np.sin(angle)
    ramp = (ramp - ramp.min()) / max(float(np.ptp(ramp)), 1e-6)
    darkness = 1 - rng.uniform(0.15, 0.40) * strength * ramp
    return np.clip(image.astype(np.float32) * darkness[..., None], 0, 255).astype(np.uint8)


def _blur(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    if rng.random() < 0.5:
        k = int(rng.choice([3, 5]))
        return cv2.GaussianBlur(image, (k, k), 0)
    k = int(rng.choice([5, 7, 9]))
    kernel = np.zeros((k, k), np.float32)
    kernel[k // 2, :] = 1.0
    rotation = cv2.getRotationMatrix2D((k / 2 - 0.5, k / 2 - 0.5), float(rng.uniform(0, 180)), 1)
    kernel = cv2.warpAffine(kernel, rotation, (k, k))
    kernel /= max(float(kernel.sum()), 1e-6)  # desenfoque de movimiento
    return cv2.filter2D(image, -1, kernel)


def _noise(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    sigma = rng.uniform(2, 8) * strength
    noise = rng.normal(0, sigma, image.shape).astype(np.float32)
    return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def _jpeg(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    quality = int(rng.integers(55, 91))
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return cv2.imdecode(buffer, cv2.IMREAD_COLOR) if ok else image


def _clahe(image: np.ndarray, rng: np.random.Generator, strength: float) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=float(rng.uniform(1.5, 3.0)), tileGridSize=(8, 8))
    lab[..., 0] = clahe.apply(lab[..., 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


_PHOTOMETRIC_OPS = [  # (función, probabilidad)
    (_gamma, 0.6), (_brightness_contrast, 0.6), (_color_temperature, 0.4), (_shadow, 0.35),
    (_blur, 0.25), (_noise, 0.3), (_clahe, 0.2), (_jpeg, 0.5),
]


def augment_photometric(image: np.ndarray, rng: np.random.Generator, strength: float = 1.0) -> np.ndarray:
    """Aplica una combinación aleatoria de aumentos que conservan la geometría. JPEG va siempre al final."""
    result = image
    for op, probability in _PHOTOMETRIC_OPS:
        if rng.random() < probability:
            result = op(result, rng, strength)
    return result


# --------------------------------------------------------------------------------------
# CLI: informe de calidad y casi-duplicados de una carpeta de fotos
# --------------------------------------------------------------------------------------
def audit_folder(folder: Path, dup_threshold: int = 6) -> dict:
    files = sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
    quality, hashes, unreadable = {}, {}, []
    for path in files:
        image = read_image(path)
        key = path.relative_to(folder).as_posix()
        if image is None:
            unreadable.append(key)
            continue
        quality[key] = image_quality(image)
        hashes[key] = dhash(image)
    groups = [g for g in group_near_duplicates(hashes, dup_threshold) if len(g) > 1]
    reasons: dict[str, int] = {}
    for info in quality.values():
        for reason in info["motivos"]:
            reasons[reason] = reasons.get(reason, 0) + 1
    return {"carpeta": str(folder), "imagenes": len(files), "ilegibles": unreadable,
            "rechazables": {k: v["motivos"] for k, v in quality.items() if not v["ok"]},
            "motivos_resumen": reasons, "grupos_casi_duplicados": groups,
            "umbral_duplicados_bits": dup_threshold,
            "umbrales_calidad": asdict(QualityThresholds())}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    audit = sub.add_parser("audit", help="calidad y casi-duplicados de una carpeta de fotos")
    audit.add_argument("folder", type=Path)
    audit.add_argument("--out", type=Path)
    audit.add_argument("--dup-threshold", type=int, default=6)
    args = parser.parse_args(argv)
    report = audit_folder(args.folder, args.dup_threshold)
    print(json.dumps({k: v for k, v in report.items() if k not in {"rechazables", "grupos_casi_duplicados"}},
                     ensure_ascii=False, indent=2))
    print(f"Rechazables: {len(report['rechazables'])} | grupos de casi-duplicados: {len(report['grupos_casi_duplicados'])}")
    if args.out:
        args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
