"""
Entrenamiento del recomendador de rutinas de coach-app (TensorFlow Lite).

El modelo NO genera la rutina completa: predice dos clases que el código de la
app ya sabe convertir en un plan (`construirPlan(iPlantilla, iEsquema)` en
`src/utils/routineGenerator.ts`):

  * plantilla semanal (6 clases)  -> PLANTILLAS_SEMANALES
  * esquema de carga  (4 clases)  -> ESQUEMAS_CARGA

El índice de cada clase DEBE coincidir con el índice del arreglo en TypeScript.

Entrada (contrato de `src/services/ai/features.ts`, VERSION_FEATURES = 1),
10 valores crudos; la normalización va DENTRO del modelo:
  edad, genero_masculino, genero_femenino, imc, nivel(0-2), dias_disponibles,
  obj_perder_peso, obj_ganar_masa, obj_mantenimiento, obj_resistencia

Salida del .tflite: UN solo tensor float32 [1, 10]
  [0:6]  -> probabilidades de plantilla
  [6:10] -> probabilidades de esquema
(se concatena a propósito: con dos salidas separadas el orden de los tensores
en el .tflite no está garantizado).

Uso:
  pip install tensorflow-cpu scikit-learn matplotlib
  python train_routine_model.py --salida ./salida
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

SEMILLA = 42
VERSION_FEATURES = 1
VERSION_MODELO = "1.1.0"

PLANTILLAS = ["3d_fuerza", "3d_cardio", "4d_fuerza", "4d_cardio", "5d_fuerza", "5d_cardio"]
ESQUEMAS = ["metabolico", "hipertrofia", "general", "resistencia"]
OBJETIVOS = ["perder_peso", "ganar_masa", "mantenimiento", "resistencia"]
GENEROS = ["masculino", "femenino", "otro"]
NIVELES = ["principiante", "intermedio", "avanzado"]
NOMBRES_FEATURES = [
    "edad", "genero_masculino", "genero_femenino", "imc", "nivel",
    "dias_disponibles", "obj_perder_peso", "obj_ganar_masa",
    "obj_mantenimiento", "obj_resistencia",
]


# ──────────────────────────────────────────────────────────────────────────
# 1. Etiquetado
# ──────────────────────────────────────────────────────────────────────────
# PORT EXACTO de `decidirClases` (src/utils/routineGenerator.ts).
# Reglas basadas en recomendaciones generales de prescripción (ACSM / OMS).
# Si cambias una regla en TypeScript, cámbiala aquí y reentrena.
DIAS_POR_NIVEL = {"principiante": 3, "intermedio": 4, "avanzado": 5}
ESQUEMA_POR_OBJETIVO = {"perder_peso": 0, "ganar_masa": 1, "mantenimiento": 2, "resistencia": 3}
UMBRAL_IMC_CARDIO = 30
EDAD_ADULTO_MAYOR = 60
EDAD_MINIMA_HIPERTROFIA = 16


def indice_plantilla(dias_por_semana: float, enfasis_cardio: bool) -> int:
    dias = min(5, max(3, int(np.floor(dias_por_semana + 0.5))))  # = Math.round
    return PLANTILLAS.index(f"{dias}d_{'cardio' if enfasis_cardio else 'fuerza'}")


def etiquetar(perfil: dict) -> tuple[int, int]:
    objetivo, nivel = perfil["objetivo"], perfil["nivel"]
    edad, imc, dias_disp = perfil.get("edad"), perfil.get("imc"), perfil.get("dias")

    maximo_nivel = DIAS_POR_NIVEL[nivel]
    dias = min(dias_disp if dias_disp is not None else maximo_nivel, maximo_nivel)

    enfasis_cardio = (
        objetivo in ("perder_peso", "resistencia")
        or (imc is not None and imc >= UMBRAL_IMC_CARDIO)
    )

    esquema = ESQUEMA_POR_OBJETIVO[objetivo]
    hipertrofia, metabolico, general = (
        ESQUEMA_POR_OBJETIVO["ganar_masa"],
        ESQUEMA_POR_OBJETIVO["perder_peso"],
        ESQUEMA_POR_OBJETIVO["mantenimiento"],
    )
    if edad is not None and edad >= EDAD_ADULTO_MAYOR and esquema in (hipertrofia, metabolico):
        esquema = general
    if edad is not None and edad < EDAD_MINIMA_HIPERTROFIA and esquema == hipertrofia:
        esquema = general

    return indice_plantilla(dias, enfasis_cardio), esquema


# ──────────────────────────────────────────────────────────────────────────
# 2. Dataset sintético
# ──────────────────────────────────────────────────────────────────────────
# Valores que la app imputa cuando faltan datos (features.ts → VALORES_POR_DEFECTO).
EDAD_POR_DEFECTO, IMC_POR_DEFECTO = 30, 24


def generar_perfiles(n: int, rng: np.random.Generator) -> list[dict]:
    perfiles = []
    for _ in range(n):
        # 40 % "realista" (usuarios típicos de gimnasio) y 35 % uniforme
        # sobre todo el rango válido: sin la parte uniforme, el modelo falla
        # en zonas poco frecuentes (adultos mayores, IMC alto) y en los
        # umbrales de las reglas (edad 16/60, IMC 30).
        # Además, un 25 % se concentra junto a los umbrales para que la red
        # aprenda cortes nítidos (una red neuronal tiende a suavizarlos).
        r = rng.random()
        if r < 0.40:
            nivel = str(rng.choice(NIVELES, p=[0.5, 0.35, 0.15]))
            edad = int(np.clip(rng.normal(28, 9), 14, 90))
            imc = float(np.clip(rng.normal(26, 5), 15, 45))
        elif r < 0.65:
            nivel = str(rng.choice(NIVELES))
            edad = int(rng.choice([*range(14, 19), *range(56, 65)])) if rng.random() < 0.6 \
                else int(rng.integers(14, 91))
            imc = float(rng.uniform(28.5, 31.5)) if rng.random() < 0.6 else float(rng.uniform(15, 45))
        else:
            nivel = str(rng.choice(NIVELES))
            edad = int(rng.integers(14, 91))
            imc = float(rng.uniform(15, 45))
        dias = int(rng.integers(2, 7))  # 2..6 = OPCIONES_DIAS_DISPONIBLES
        perfil = {
            "edad": edad,
            "genero": str(rng.choice(GENEROS, p=[0.48, 0.48, 0.04])),
            "imc": round(imc, 1),  # calcularIMC redondea a 1 decimal
            "nivel": nivel,
            "dias": dias,
            "objetivo": str(rng.choice(OBJETIVOS)),
        }
        # 10 %: perfil antiguo sin datos físicos → la app imputa por defecto.
        if rng.random() < 0.10:
            perfil.update(edad=EDAD_POR_DEFECTO, imc=IMC_POR_DEFECTO, dias=DIAS_POR_NIVEL[nivel])
        perfiles.append(perfil)
    return perfiles


def a_features(p: dict) -> list[float]:
    """Debe producir EXACTAMENTE lo mismo que `construirFeatures` en features.ts."""
    return [
        float(p["edad"]),
        1.0 if p["genero"] == "masculino" else 0.0,
        1.0 if p["genero"] == "femenino" else 0.0,
        round(p["imc"], 1),
        float(NIVELES.index(p["nivel"])),
        float(p["dias"]),
        *[1.0 if p["objetivo"] == o else 0.0 for o in OBJETIVOS],
    ]


# ──────────────────────────────────────────────────────────────────────────
# 3. Modelo
# ──────────────────────────────────────────────────────────────────────────
def construir_modelo(x_entrenamiento: np.ndarray) -> tf.keras.Model:
    entrada = tf.keras.Input(shape=(len(NOMBRES_FEATURES),), name="features")
    normalizacion = tf.keras.layers.Normalization(name="normalizacion")
    normalizacion.adapt(x_entrenamiento)

    x = normalizacion(entrada)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    x = tf.keras.layers.Dense(32, activation="relu")(x)
    plantilla = tf.keras.layers.Dense(len(PLANTILLAS), activation="softmax", name="plantilla")(x)
    esquema = tf.keras.layers.Dense(len(ESQUEMAS), activation="softmax", name="esquema")(x)

    modelo = tf.keras.Model(entrada, [plantilla, esquema], name="recomendador_rutinas")
    modelo.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss=["sparse_categorical_crossentropy", "sparse_categorical_crossentropy"],
        metrics=[["accuracy"], ["accuracy"]],
    )
    return modelo


def exportar_tflite(modelo: tf.keras.Model, ruta: Path) -> None:
    entrada = tf.keras.Input(shape=(len(NOMBRES_FEATURES),), name="features")
    plantilla, esquema = modelo(entrada)
    salida = tf.keras.layers.Concatenate(name="salida")([plantilla, esquema])
    envoltura = tf.keras.Model(entrada, salida)

    convertidor = tf.lite.TFLiteConverter.from_keras_model(envoltura)
    ruta.write_bytes(convertidor.convert())


# ──────────────────────────────────────────────────────────────────────────
# 4. Pipeline
# ──────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--salida", type=Path, default=Path("salida"))
    parser.add_argument("--muestras", type=int, default=60000)
    args = parser.parse_args()
    args.salida.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(SEMILLA)
    tf.keras.utils.set_random_seed(SEMILLA)

    perfiles = generar_perfiles(args.muestras, rng)
    x = np.array([a_features(p) for p in perfiles], dtype=np.float32)
    etiquetas = np.array([etiquetar(p) for p in perfiles])
    y_plantilla, y_esquema = etiquetas[:, 0], etiquetas[:, 1]

    # 70 / 15 / 15, estratificado por la combinación de ambas clases
    combinada = y_plantilla * len(ESQUEMAS) + y_esquema
    idx = np.arange(len(x))
    idx_ent, idx_tmp = train_test_split(idx, test_size=0.30, random_state=SEMILLA, stratify=combinada)
    idx_val, idx_test = train_test_split(idx_tmp, test_size=0.50, random_state=SEMILLA, stratify=combinada[idx_tmp])

    modelo = construir_modelo(x[idx_ent])
    historial = modelo.fit(
        x[idx_ent], [y_plantilla[idx_ent], y_esquema[idx_ent]],
        validation_data=(x[idx_val], [y_plantilla[idx_val], y_esquema[idx_val]]),
        epochs=400, batch_size=128, verbose=0,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=30, restore_best_weights=True)],
    )

    # ── Evaluación en el conjunto de prueba (nunca visto) ──
    p_plantilla, p_esquema = modelo.predict(x[idx_test], verbose=0)
    pred_plantilla, pred_esquema = p_plantilla.argmax(1), p_esquema.argmax(1)

    metricas = {
        "version_modelo": VERSION_MODELO,
        "version_features": VERSION_FEATURES,
        "muestras": {"entrenamiento": len(idx_ent), "validacion": len(idx_val), "prueba": len(idx_test)},
        "epocas_entrenadas": len(historial.history["loss"]),
        "exactitud_prueba": {
            "plantilla": float((pred_plantilla == y_plantilla[idx_test]).mean()),
            "esquema": float((pred_esquema == y_esquema[idx_test]).mean()),
            "ambas": float(((pred_plantilla == y_plantilla[idx_test]) & (pred_esquema == y_esquema[idx_test])).mean()),
        },
        "reporte_plantilla": classification_report(
            y_plantilla[idx_test], pred_plantilla, labels=range(len(PLANTILLAS)),
            target_names=PLANTILLAS, output_dict=True, zero_division=0),
        "reporte_esquema": classification_report(
            y_esquema[idx_test], pred_esquema, labels=range(len(ESQUEMAS)),
            target_names=ESQUEMAS, output_dict=True, zero_division=0),
        "matriz_confusion_plantilla": confusion_matrix(
            y_plantilla[idx_test], pred_plantilla, labels=range(len(PLANTILLAS))).tolist(),
        "matriz_confusion_esquema": confusion_matrix(
            y_esquema[idx_test], pred_esquema, labels=range(len(ESQUEMAS))).tolist(),
    }

    # ── Exportación y verificación del .tflite ──
    ruta_tflite = args.salida / "routine_recommender.tflite"
    exportar_tflite(modelo, ruta_tflite)

    interprete = tf.lite.Interpreter(model_path=str(ruta_tflite))
    interprete.allocate_tensors()
    ent, sal = interprete.get_input_details()[0], interprete.get_output_details()[0]
    coincidencias = 0
    for i in idx_test:
        interprete.set_tensor(ent["index"], x[i : i + 1])
        interprete.invoke()
        out = interprete.get_tensor(sal["index"])[0]
        coincidencias += int(out[:6].argmax() == pred_plantilla[list(idx_test).index(i)]
                             and out[6:].argmax() == pred_esquema[list(idx_test).index(i)])
    metricas["tflite"] = {
        "bytes": ruta_tflite.stat().st_size,
        "entrada": {"forma": ent["shape"].tolist(), "tipo": str(ent["dtype"].__name__)},
        "salida": {"forma": sal["shape"].tolist(), "tipo": str(sal["dtype"].__name__)},
        "coincidencia_con_keras": coincidencias / len(idx_test),
    }

    metricas["cuadricula_exhaustiva"] = evaluar_cuadricula(ruta_tflite)

    (args.salida / "metrics.json").write_text(json.dumps(metricas, indent=2, ensure_ascii=False))
    (args.salida / "model_metadata.json").write_text(json.dumps({
        "version_modelo": VERSION_MODELO,
        "version_features": VERSION_FEATURES,
        "features": NOMBRES_FEATURES,
        "salida": {"plantilla": [0, 6], "esquema": [6, 10]},
        "plantillas": PLANTILLAS,
        "esquemas": ESQUEMAS,
    }, indent=2, ensure_ascii=False))

    graficar_matrices(metricas, args.salida)
    resumen = {k: metricas[k] for k in ("exactitud_prueba", "epocas_entrenadas", "tflite")}
    resumen["cuadricula_exhaustiva"] = {k: metricas["cuadricula_exhaustiva"][k] for k in ("total", "aciertos", "exactitud")}
    print(json.dumps(resumen, indent=2))


def evaluar_cuadricula(ruta_tflite: Path) -> dict:
    """
    Recorre TODAS las combinaciones de una cuadrícula que incluye los
    umbrales de las reglas (edad 15/16, 59/60/61; IMC 29.9/30) y los datos
    faltantes que la app imputa, y compara el .tflite contra las reglas.
    Es una prueba más exigente que el conjunto de prueba aleatorio.
    """
    interprete = tf.lite.Interpreter(model_path=str(ruta_tflite))
    interprete.allocate_tensors()
    ent, sal = interprete.get_input_details()[0], interprete.get_output_details()[0]
    total = aciertos = 0
    errores: list[dict] = []
    for objetivo, nivel, dias, edad, imc, genero in itertools.product(
        OBJETIVOS, NIVELES, [2, 3, 4, 5, 6, None],
        [14, 15, 16, 20, 30, 45, 59, 60, 61, 75, 90, None],
        [16, 18.5, 22, 25, 29.4, 29.9, 30, 30.5, 35, 42, None], GENEROS,
    ):
        perfil = {"objetivo": objetivo, "nivel": nivel, "dias": dias,
                  "edad": edad, "imc": imc, "genero": genero}
        esperado = etiquetar(perfil)
        imputado = dict(perfil,
                        edad=EDAD_POR_DEFECTO if edad is None else edad,
                        imc=IMC_POR_DEFECTO if imc is None else imc,
                        dias=DIAS_POR_NIVEL[nivel] if dias is None else dias)
        interprete.set_tensor(ent["index"], np.array([a_features(imputado)], dtype=np.float32))
        interprete.invoke()
        out = interprete.get_tensor(sal["index"])[0]
        prediccion = (int(out[:6].argmax()), int(out[6:].argmax()))
        total += 1
        if prediccion == esperado:
            aciertos += 1
        elif len(errores) < 20:
            errores.append({"perfil": perfil, "esperado": esperado, "predicho": prediccion})
    return {"total": total, "aciertos": aciertos, "exactitud": aciertos / total,
            "ejemplos_error": errores}


NOMBRES_PNG = {
    "matriz_confusion_plantilla": "confusion_matrix_template",
    "matriz_confusion_esquema": "confusion_matrix_scheme",
}


def graficar_matrices(metricas: dict, salida: Path) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    for clave, nombres, titulo in (
        ("matriz_confusion_plantilla", PLANTILLAS, "Plantilla semanal"),
        ("matriz_confusion_esquema", ESQUEMAS, "Esquema de carga"),
    ):
        m = np.array(metricas[clave])
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.imshow(m, cmap="Greens")
        ax.set_xticks(range(len(nombres)), nombres, rotation=45, ha="right")
        ax.set_yticks(range(len(nombres)), nombres)
        ax.set_xlabel("Predicción")
        ax.set_ylabel("Real")
        ax.set_title(f"Matriz de confusión — {titulo}")
        for (i, j), v in np.ndenumerate(m):
            ax.text(j, i, str(v), ha="center", va="center",
                    color="white" if v > m.max() / 2 else "black", fontsize=9)
        fig.tight_layout()
        fig.savefig(salida / f"{NOMBRES_PNG[clave]}.png", dpi=150)
        plt.close(fig)


if __name__ == "__main__":
    main()
