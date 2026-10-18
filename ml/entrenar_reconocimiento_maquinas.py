"""
Entrenamiento del reconocedor de máquinas de coach-app (TensorFlow Lite).

Clasificador de imágenes por transferencia de aprendizaje:
  MobileNetV2 (ImageNet, congelado) → normalización L2 → regresión logística
  multinomial (softmax, 35 clases). La regresión se ajusta con scikit-learn
  sobre los embeddings y sus pesos se copian a una capa Dense de Keras.

Las clases son los IDs del catálogo de Firestore (`maquinas/{id}`), tomados
de los nombres de carpeta sin el prefijo numérico (`21-prensa-piernas` →
`prensa-piernas`). El índice de la clase es la posición en `etiquetas.json`.

Datos: fotos de catálogo (renders de estudio sobre fondo blanco/gris). Para
reducir la brecha con la cámara real, cada foto se aumenta así:
  1. Se separa la máquina del fondo (canal alfa o, si no hay, diferencia de
     color respecto del borde de la imagen).
  2. Se pega sobre fondos variados (degradados, texturas, "piso + pared"),
     con escala, posición, giro y espejo aleatorios.
  3. Se simulan condiciones de cámara: brillo/contraste/saturación,
     desenfoque, ruido y compresión JPEG.

Evaluación: validación cruzada estratificada por FOTO ORIGINAL (las variantes
de una foto de prueba nunca se ven en entrenamiento), en dos escenarios:
  * "limpia": la foto de catálogo tal cual.
  * "campo simulado": la foto de prueba aumentada como si fuera de cámara.
Esto NO reemplaza una evaluación con fotos reales del gimnasio.

Entrada del .tflite: float32 [1, 224, 224, 3], valores RGB 0..255 (el
preprocesamiento de MobileNetV2 va dentro del modelo).
Salida: float32 [1, N_CLASES] con probabilidades.

Uso:
  pip install tensorflow-cpu scikit-learn pillow matplotlib
  python entrenar_reconocimiento_maquinas.py --datos ./dataset --salida ./salida
  (opcional) --pesos mobilenet_v2_weights_tf_dim_ordering_tf_kernels_1.0_224_no_top.h5
"""

from __future__ import annotations

import argparse
import io
import json
import re
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image, ImageFilter, ImageEnhance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix

SEMILLA = 42
TAM = 224
VERSION_MODELO = "1.0.0"
VERSION_DATASET = "catalogo-35-v1"
EXTENSIONES = {".png", ".jpg", ".jpeg", ".webp"}


# ──────────────────────────────────────────────────────────────────────────
# 1. Carga y segmentación
# ──────────────────────────────────────────────────────────────────────────
def id_clase(carpeta: str) -> str:
    return re.sub(r"^\d+-", "", carpeta)


def segmentar(img: Image.Image) -> tuple[Image.Image, Image.Image | None]:
    """Devuelve (imagen RGB recortada, máscara L o None si no se pudo separar)."""
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).astype(np.int16)
    alfa = arr[..., 3]

    if alfa.min() < 250:  # PNG/WebP con transparencia real
        mascara = alfa > 40
    else:
        # Fondo = mediana del borde; máscara = píxeles que se alejan de él.
        borde = np.concatenate([arr[0, :, :3], arr[-1, :, :3], arr[:, 0, :3], arr[:, -1, :3]])
        fondo = np.median(borde, axis=0)
        distancia = np.abs(arr[..., :3] - fondo).sum(axis=-1)
        mascara = distancia > 45

    cobertura = mascara.mean()
    blanco = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    rgb = Image.alpha_composite(blanco, rgba).convert("RGB")
    if not 0.03 < cobertura < 0.93:
        return rgb, None  # fondo no separable (foto con escena, p. ej.)

    m = Image.fromarray((mascara * 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    caja = m.getbbox()
    if caja is None:
        return rgb, None
    x0, y0, x1, y1 = caja
    margen = int(0.03 * max(rgb.size))
    caja = (max(0, x0 - margen), max(0, y0 - margen), min(rgb.width, x1 + margen), min(rgb.height, y1 + margen))
    return rgb.crop(caja), m.crop(caja)


def cargar_dataset(raiz: Path) -> tuple[list[str], list[dict]]:
    carpetas = sorted(p for p in raiz.iterdir() if p.is_dir())
    etiquetas = [id_clase(c.name) for c in carpetas]
    muestras = []
    for i, carpeta in enumerate(carpetas):
        for archivo in sorted(carpeta.iterdir()):
            if archivo.suffix.lower() not in EXTENSIONES:
                continue
            img = Image.open(archivo)
            img.load()
            if max(img.size) > 1200:
                img.thumbnail((1200, 1200))
            rgb, mascara = segmentar(img)
            muestras.append({"clase": i, "archivo": f"{carpeta.name}/{archivo.name}",
                             "rgb": rgb, "mascara": mascara})
    return etiquetas, muestras


# ──────────────────────────────────────────────────────────────────────────
# 2. Aumento de datos
# ──────────────────────────────────────────────────────────────────────────
def fondo_aleatorio(rng: np.random.Generator) -> Image.Image:
    tipo = rng.integers(0, 4)
    if tipo == 0:  # degradado vertical
        a, b = rng.integers(30, 235, 3), rng.integers(30, 235, 3)
        t = np.linspace(0, 1, TAM)[:, None, None]
        arr = (a * (1 - t) + b * t) * np.ones((TAM, TAM, 3))
    elif tipo == 1:  # textura (ruido suavizado)
        base = rng.integers(40, 220, 3)
        ruido = rng.normal(0, 35, (TAM // 8, TAM // 8, 3))
        ruido = np.asarray(Image.fromarray(np.clip(ruido + 128, 0, 255).astype(np.uint8)).resize((TAM, TAM), Image.BICUBIC)).astype(float) - 128
        arr = base + ruido
    elif tipo == 2:  # "gimnasio": pared clara + piso oscuro con brillo
        pared = rng.integers(150, 245, 3)
        piso = rng.integers(20, 90, 3)
        horizonte = int(TAM * rng.uniform(0.45, 0.75))
        arr = np.ones((TAM, TAM, 3)) * pared
        arr[horizonte:] = piso
        arr += rng.normal(0, 8, arr.shape)
    else:  # liso
        arr = np.ones((TAM, TAM, 3)) * rng.integers(20, 250, 3)
    # Los gimnasios son mayormente neutros: 75 % de los fondos se desaturan.
    if rng.random() < 0.75:
        gris = arr.mean(axis=-1, keepdims=True)
        arr = gris + (arr - gris) * rng.uniform(0.0, 0.35)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def ajustar(img: Image.Image, rng: np.random.Generator, escala_min: float) -> Image.Image:
    """Escala la imagen dentro de un lienzo TAM×TAM y la posiciona al azar (solo para con máscara)."""
    lado = TAM * rng.uniform(escala_min, 1.0)
    factor = lado / max(img.size)
    return img.resize((max(1, int(img.width * factor)), max(1, int(img.height * factor))), Image.BILINEAR)


def aumentar(muestra: dict, rng: np.random.Generator, intensidad: float = 1.0) -> np.ndarray:
    rgb, mascara = muestra["rgb"], muestra["mascara"]

    if rng.random() < 0.5:
        rgb = rgb.transpose(Image.FLIP_LEFT_RIGHT)
        mascara = mascara.transpose(Image.FLIP_LEFT_RIGHT) if mascara is not None else None
    angulo = rng.uniform(-8, 8) * intensidad
    rgb = rgb.rotate(angulo, resample=Image.BILINEAR, expand=True, fillcolor=(255, 255, 255))
    if mascara is not None:
        mascara = mascara.rotate(angulo, resample=Image.BILINEAR, expand=True, fillcolor=0)

    if mascara is not None and rng.random() < 0.85:
        lienzo = fondo_aleatorio(rng)
        obj = ajustar(rgb, rng, 0.55)
        m = mascara.resize(obj.size, Image.BILINEAR)
        x = int(rng.uniform(0, TAM - obj.width + 1))
        y = int(rng.uniform(0, TAM - obj.height + 1))
        lienzo.paste(obj, (x, y), m)
        img = lienzo
    else:
        # Recorte aleatorio (zoom) sobre la foto original.
        w, h = rgb.size
        z = rng.uniform(0.75, 1.0)
        cw, ch = int(w * z), int(h * z)
        x, y = int(rng.uniform(0, w - cw + 1)), int(rng.uniform(0, h - ch + 1))
        img = rgb.crop((x, y, x + cw, y + ch))
        lado = max(img.size)
        cuadro = Image.new("RGB", (lado, lado), tuple(int(v) for v in np.asarray(img)[0, 0]))
        cuadro.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2))
        img = cuadro.resize((TAM, TAM), Image.BILINEAR)

    # Condiciones de cámara
    img = ImageEnhance.Brightness(img).enhance(rng.uniform(1 - 0.35 * intensidad, 1 + 0.3 * intensidad))
    img = ImageEnhance.Contrast(img).enhance(rng.uniform(1 - 0.3 * intensidad, 1 + 0.3 * intensidad))
    img = ImageEnhance.Color(img).enhance(rng.uniform(1 - 0.3 * intensidad, 1 + 0.2 * intensidad))
    if rng.random() < 0.35 * intensidad:
        img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.5, 1.8)))
    arr = np.asarray(img).astype(np.float32)
    if rng.random() < 0.4 * intensidad:
        arr += rng.normal(0, rng.uniform(3, 10), arr.shape)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    if rng.random() < 0.5 * intensidad:
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=int(rng.uniform(35, 85)))
        img = Image.open(buf).convert("RGB")
    return np.asarray(img, dtype=np.uint8)


def version_limpia(muestra: dict) -> np.ndarray:
    """La foto de catálogo centrada sobre blanco, sin aumentos."""
    img = muestra["rgb"]
    lado = max(img.size)
    cuadro = Image.new("RGB", (lado, lado), (255, 255, 255))
    if muestra["mascara"] is not None:
        cuadro.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2), muestra["mascara"])
    else:
        cuadro.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2))
    return np.asarray(cuadro.resize((TAM, TAM), Image.BILINEAR), dtype=np.uint8)


# ──────────────────────────────────────────────────────────────────────────
# 3. Modelo
# ──────────────────────────────────────────────────────────────────────────
def construir_extractor(pesos: str | None) -> tf.keras.Model:
    entrada = tf.keras.Input((TAM, TAM, 3), name="imagen_rgb_0_255")
    x = tf.keras.layers.Rescaling(1 / 127.5, offset=-1, name="preprocesamiento")(entrada)
    base = tf.keras.applications.MobileNetV2(
        input_shape=(TAM, TAM, 3), include_top=False, pooling="avg",
        weights=pesos if pesos else "imagenet")
    base.trainable = False
    return tf.keras.Model(entrada, base(x, training=False), name="extractor")


C_REGULARIZACION = 10.0


def l2(x: np.ndarray) -> np.ndarray:
    return x / np.maximum(1e-12, np.linalg.norm(x, axis=-1, keepdims=True))


def entrenar_clasificador(x: np.ndarray, y: np.ndarray, n_clases: int) -> LogisticRegression:
    clf = LogisticRegression(C=C_REGULARIZACION, max_iter=3000)
    clf.fit(l2(x), y)
    assert list(clf.classes_) == list(range(n_clases)), "falta alguna clase en el entrenamiento"
    return clf


def cabeza_keras(clf: LogisticRegression, dim: int) -> tf.keras.Model:
    """Capa equivalente a `clf.predict_proba(l2(x))`."""
    entrada = tf.keras.Input((dim,), name="embedding")
    x = tf.keras.layers.UnitNormalization(name="normalizacion_l2")(entrada)
    densa = tf.keras.layers.Dense(clf.coef_.shape[0], activation="softmax", name="clase")
    salida = densa(x)
    densa.set_weights([clf.coef_.T.astype(np.float32), clf.intercept_.astype(np.float32)])
    return tf.keras.Model(entrada, salida, name="cabeza")


def embeddings(extractor: tf.keras.Model, imagenes: np.ndarray) -> np.ndarray:
    return extractor.predict(imagenes.astype(np.float32), batch_size=64, verbose=0)


def topk(probs: np.ndarray, y: np.ndarray, k: int) -> float:
    return float(np.mean([yy in np.argsort(-p)[:k] for p, yy in zip(probs, y)]))


# ──────────────────────────────────────────────────────────────────────────
# 4. Pipeline
# ──────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--datos", type=Path, required=True)
    parser.add_argument("--salida", type=Path, default=Path("salida_maquinas"))
    parser.add_argument("--pesos", type=str, default=None)
    parser.add_argument("--aumentos", type=int, default=40, help="variantes por foto de entrenamiento")
    parser.add_argument("--aumentos-prueba", type=int, default=6, help="variantes 'campo simulado' por foto de prueba")
    parser.add_argument("--pliegues", type=int, default=5)
    args = parser.parse_args()
    args.salida.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEMILLA)
    tf.keras.utils.set_random_seed(SEMILLA)

    etiquetas, muestras = cargar_dataset(args.datos)
    y = np.array([m["clase"] for m in muestras])
    n_clases = len(etiquetas)
    conteo = np.bincount(y, minlength=n_clases)
    print(f"{len(muestras)} fotos, {n_clases} clases, "
          f"segmentadas: {sum(m['mascara'] is not None for m in muestras)}")

    extractor = construir_extractor(args.pesos)

    # Embeddings precalculados (el extractor está congelado). Se guardan por
    # foto en `salida/cache/` para poder reanudar si el proceso se corta.
    cache = args.salida / "cache"
    cache.mkdir(exist_ok=True)
    emb_aum, emb_limpia, emb_campo = [], [], []
    for i, m in enumerate(muestras):
        archivo = cache / f"{i:04d}.npz"
        if archivo.exists():
            datos = np.load(archivo)
        else:
            rng_i = np.random.default_rng(SEMILLA + i)  # reproducible por foto
            datos = {
                "aum": embeddings(extractor, np.stack([aumentar(m, rng_i) for _ in range(args.aumentos)])),
                "limpia": embeddings(extractor, version_limpia(m)[None])[0],
                "campo": embeddings(extractor, np.stack([aumentar(m, rng_i, 1.0) for _ in range(args.aumentos_prueba)])),
            }
            np.savez(archivo, **datos)
        emb_aum.append(datos["aum"])
        emb_limpia.append(datos["limpia"])
        emb_campo.append(datos["campo"])
        if (i + 1) % 25 == 0:
            print(f"  embeddings {i + 1}/{len(muestras)}", flush=True)
    emb_aum, emb_limpia, emb_campo = np.stack(emb_aum), np.stack(emb_limpia), np.stack(emb_campo)
    dim = emb_limpia.shape[1]

    # ── Validación cruzada por foto original ──
    # 5 pliegues: dentro de cada clase las fotos se reparten en round-robin.
    # Las clases con 1 sola foto quedan siempre en entrenamiento.
    pliegues = args.pliegues
    asignacion = np.zeros(len(y), int)
    rng_pl = np.random.default_rng(SEMILLA)
    for k in range(n_clases):
        idx = np.where(y == k)[0]
        rng_pl.shuffle(idx)
        asignacion[idx] = np.arange(len(idx)) % pliegues
    res = {"limpia": {"top1": [], "top3": []}, "campo": {"top1": [], "top3": []}}
    y_real, y_pred, confianzas = [], [], []
    for k in range(pliegues):
        te = np.where((asignacion == k) & (conteo[y] >= 2))[0]
        tr = np.setdiff1d(np.arange(len(y)), te)
        clf = entrenar_clasificador(emb_aum[tr].reshape(-1, dim), np.repeat(y[tr], args.aumentos), n_clases)
        p_limpia = clf.predict_proba(l2(emb_limpia[te]))
        p_campo = clf.predict_proba(l2(emb_campo[te].reshape(-1, dim)))
        y_campo = np.repeat(y[te], args.aumentos_prueba)
        for nombre, p, yy in (("limpia", p_limpia, y[te]), ("campo", p_campo, y_campo)):
            res[nombre]["top1"].append(topk(p, yy, 1))
            res[nombre]["top3"].append(topk(p, yy, 3))
        y_real.extend(y_campo.tolist())
        y_pred.extend(p_campo.argmax(1).tolist())
        confianzas.extend(p_campo.max(1).tolist())
        print(f"pliegue {k + 1}/{pliegues}: limpia top1={res['limpia']['top1'][-1]:.3f} "
              f"campo top1={res['campo']['top1'][-1]:.3f} top3={res['campo']['top3'][-1]:.3f}", flush=True)

    # Calibración del umbral: precisión y cobertura de la detección automática.
    aciertos = np.array(y_real) == np.array(y_pred)
    confianzas = np.array(confianzas)
    calibracion = []
    for u in (0.3, 0.5, 0.6, 0.7, 0.8, 0.9):
        usa = confianzas >= u
        calibracion.append({"umbral": u, "cobertura": float(usa.mean()),
                            "precision": float(aciertos[usa].mean()) if usa.any() else None})

    # Exactitud por clase (campo simulado)
    matriz = confusion_matrix(y_real, y_pred, labels=range(n_clases))
    por_clase = {etiquetas[i]: {"fotos": int(conteo[i]),
                                "exactitud_campo": (float(matriz[i, i] / matriz[i].sum()) if matriz[i].sum() else None)}
                 for i in range(n_clases)}

    # ── Modelo final con todas las fotos ──
    clf = entrenar_clasificador(emb_aum.reshape(-1, dim), np.repeat(y, args.aumentos), n_clases)
    cabeza = cabeza_keras(clf, dim)
    entrada = tf.keras.Input((TAM, TAM, 3), name="imagen_rgb_0_255")
    completo = tf.keras.Model(entrada, cabeza(extractor(entrada)), name="reconocedor_maquinas")

    convertidor = tf.lite.TFLiteConverter.from_keras_model(completo)
    # float16: reduce a la mitad sin cambiar las predicciones (int8 alteraba ~5 %).
    convertidor.optimizations = [tf.lite.Optimize.DEFAULT]
    convertidor.target_spec.supported_types = [tf.float16]
    ruta = args.salida / "machine_recognizer.tflite"
    ruta.write_bytes(convertidor.convert())

    # Verificación .tflite vs Keras
    interprete = tf.lite.Interpreter(model_path=str(ruta))
    interprete.allocate_tensors()
    ent, sal = interprete.get_input_details()[0], interprete.get_output_details()[0]
    muestra_v = np.stack([version_limpia(m) for m in muestras[::10]]).astype(np.float32)
    p_keras = completo.predict(muestra_v, verbose=0)
    coincide = 0
    for i in range(len(muestra_v)):
        interprete.set_tensor(ent["index"], muestra_v[i:i + 1])
        interprete.invoke()
        coincide += int(interprete.get_tensor(sal["index"])[0].argmax() == p_keras[i].argmax())

    media = lambda v: float(np.mean(v))
    metricas = {
        "version_modelo": VERSION_MODELO,
        "fotos": len(muestras), "clases": n_clases, "pliegues": pliegues,
        "aumentos_por_foto": args.aumentos,
        "validacion_cruzada": {
            "limpia": {"top1": media(res["limpia"]["top1"]), "top3": media(res["limpia"]["top3"])},
            "campo_simulado": {"top1": media(res["campo"]["top1"]), "top3": media(res["campo"]["top3"])},
        },
        "calibracion_umbral": calibracion,
        "por_clase": por_clase,
        "matriz_confusion_campo": matriz.tolist(),
        "tflite": {"bytes": ruta.stat().st_size, "entrada": ent["shape"].tolist(),
                   "salida": sal["shape"].tolist(), "coincidencia_con_keras": coincide / len(muestra_v)},
    }
    (args.salida / "metricas_reconocimiento.json").write_text(json.dumps(metricas, indent=2, ensure_ascii=False))
    (args.salida / "etiquetas.json").write_text(json.dumps(
        {"version_modelo": VERSION_MODELO, "entrada": "float32 [1,224,224,3] RGB 0..255",
         "etiquetas": etiquetas}, indent=2, ensure_ascii=False))
    graficar(matriz, etiquetas, args.salida / "matriz_confusion_reconocimiento.png")
    print(json.dumps({k: metricas[k] for k in ("validacion_cruzada", "calibracion_umbral", "tflite")}, indent=2))


def graficar(matriz: np.ndarray, etiquetas: list[str], ruta: Path) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    norm = matriz / np.maximum(1, matriz.sum(1, keepdims=True))
    fig, ax = plt.subplots(figsize=(13, 11))
    ax.imshow(norm, cmap="Greens", vmin=0, vmax=1)
    ax.set_xticks(range(len(etiquetas)), etiquetas, rotation=90, fontsize=7)
    ax.set_yticks(range(len(etiquetas)), etiquetas, fontsize=7)
    ax.set_xlabel("Predicción")
    ax.set_ylabel("Real")
    ax.set_title("Reconocimiento de máquinas — matriz de confusión (campo simulado, validación cruzada)")
    fig.tight_layout()
    fig.savefig(ruta, dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    main()
