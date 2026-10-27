# Reconocimiento de máquinas con YOLO11n-cls (v2)

Pipeline **offline** (Python) que entrena y exporta el clasificador de máquinas de coach-app (OE1).
Estado al **26 de octubre de 2026**: entrenado y exportado, **no conectado a la app** (el modelo activo
sigue siendo `assets/models/machine_recognizer.tflite`, MobileNetV2).

## Dónde encaja en el MVC de coach-app

El entrenamiento no es una capa de la app: vive en `ml/`, fuera de `src/`, y entrega un único artefacto
(`.tflite`) que la app consume en tiempo de ejecución. La app mantiene su separación de capas; el modelo se
cambia por reemplazo de archivo, sin tocar Vista ni Controlador.

| Capa MVC | Archivo de la app | Qué hace con el reconocimiento |
|---|---|---|
| **Vista** | `src/app/(app)/machines/scanner.tsx`, `src/components/machines/scanner/*` | Captura la foto y muestra "Detectada · N %" o la lista de sugerencias. No conoce el modelo. |
| **Controlador** | `src/controllers/MachinesController.ts` (`reconocerDesdeFoto`) | Decide: confianza ≥ `CONFIANZA_MINIMA` → detección; si no, sugerencia para confirmar. |
| **Servicio** (integración) | `src/services/ai/machineRecognition.ts` (+ `.web.ts`), `machineLabels.ts` | Preprocesa la foto, ejecuta el TFLite y devuelve top-3. **Aquí es donde se carga el modelo.** |
| **Modelo** (datos) | `src/models/entities/Machine.ts`, `repositories/machineRepository.ts` | Ficha de la máquina en Firestore (`maquinas/{id}`); el id es la clase que predice el modelo. |
| **Offline (esta carpeta)** | `ml/recognition-yolo/` | Datos → entrenamiento → evaluación → `.tflite` con el contrato de la app. |

Contrato que respeta el modelo exportado: entrada `float32 [1,224,224,3]` RGB 0..255, salida `float32 [1,35]`
softmax, en el orden de `machineLabels.ts` (copia en `model/labels.json`).

**Cómo se usan las etiquetas durante el entrenamiento:** YOLO11-cls no lee los archivos `labels.json`
ni los TXT de cajas. Lee las carpetas `train/<nombre-clase>` y `val/<nombre-clase>`; el ID lo asigna por
orden alfabético de carpeta. `build_dataset.py` ahora exige exactamente las 35 carpetas y escribe
`class-map.json` con la relación `id_yolo → nombre → indice_app`. `train.py` vuelve a comprobar las 35
clases antes de entrenar y verifica los nombres guardados en `best.pt` al terminar. Exportar comprueba
ese mismo orden y reordena logits al índice de `machineLabels.ts`. Los tres catálogos de etiquetas se
comparan byte por byte en orden antes de construir el dataset.

## Estructura de la carpeta

```
ml/recognition-yolo/
├── README.md
├── config.json              # hiperparámetros y reglas de datos (semilla 42)
├── requirements.txt
├── data/real_photos/        # 32 fotos de gimnasios (sin logo/banner), una carpeta por clase + manifest.json
├── scripts/
│   ├── common.py            # rutas y orden de clases
│   ├── clean_branding.py    # quita logo/banner rojo de fotos promocionales
│   ├── build_dataset.py     # --mode eval | final (split por grupos de casi-duplicados, OpenCV)
│   ├── train.py             # YOLO11n-cls + training_context.json y environment.lock.txt
│   ├── evaluate.py          # top-1/top-3 en fotos reales (yolo o tflite de la app); --summary
│   ├── export_tflite.py     # .pt -> .tflite con el contrato de la app + verificación + manifiesto
│   ├── make_manifest.py     # crea/verifica <modelo>.manifest.json
│   └── tests/               # contrato de clases, manifiesto y build_dataset
├── model/
│   ├── machine_recognizer_yolo.tflite            # 6,1 MB, listo para usar
│   ├── machine_recognizer_yolo.manifest.json     # ficha técnica: sha256, contrato, métricas, advertencias
│   └── labels.json
├── weights/yolo11n-cls_machines_v2.pt   # pesos PyTorch (versión final)
└── results/                 # curvas, matrices de confusión, predicciones por foto
```

Los datasets generados (`_build/`) y las corridas (`runs/`) no se versionan.

## Datos

| Fuente | Fotos | Uso |
|---|---|---|
| Catálogo: `ml/detection/dataset/images` | 397 | train 85 % / val 15 % |
| Externas Kaggle: `ml/detection/dataset/externo-kaggle` (solo `eliptica`, `banco-pecho`) | 305 + 60 | completan hasta 60 fotos de train por clase |
| Fotos de gimnasios reales: `data/real_photos` | 32 (18 clases) | `eval`: **prueba**. `final`: train (x3) |

Pendientes: (1) las etiquetas de las fotos reales fueron sugeridas automáticamente y **no están confirmadas**
(ver `data/real_photos/manifest.json`); (2) licencias de Kaggle y de las fotos promocionales (Kong, AAA-FIT);
(3) `smith` de Kaggle se excluyó por mezclar jaulas y estaciones multifunción.

## Auditoría del contrato de clases

Desde la raíz de `coach-app`:

```powershell
python ml/recognition-yolo/scripts/tests/test_labels.py
```

Resultado verificado en este código: 35 nombres únicos y el mismo orden en `ml/results/recognition/labels.json`,
`ml/recognition-yolo/model/labels.json` y `src/services/ai/machineLabels.ts`. El test además verifica la
asignación alfabética de IDs que consume YOLO-cls, el mapa hacia el orden de la app, el rechazo de clases
faltantes/sobrantes y el bloqueo de validaciones vacías. Ningún test sustituye la confirmación visual de que
la etiqueta humana elegida en una foto real es correcta.

## Cómo reproducir (desde la raíz de coach-app)

```powershell
python -m venv ml/recognition-yolo/.venv
ml/recognition-yolo/.venv/Scripts/python.exe -m pip install -r ml/recognition-yolo/requirements.txt
$py = "ml/recognition-yolo/.venv/Scripts/python.exe"; $d = "ml/recognition-yolo/scripts"

# 1) Medir (fotos reales como prueba)
& $py $d/build_dataset.py --mode eval
& $py $d/train.py --mode eval --name eval-n224
& $py $d/evaluate.py --kind yolo --model ml/recognition-yolo/runs/eval-n224/weights/best.pt
& $py $d/evaluate.py --kind tflite --model assets/models/machine_recognizer.tflite   # modelo actual

# 2) Modelo final (fotos reales dentro de train) y exportación
& $py $d/build_dataset.py --mode final
& $py $d/train.py --mode final --name final-n224
& $py $d/evaluate.py --kind yolo --model ml/recognition-yolo/runs/eval-n224/weights/best.pt --summary ml/recognition-yolo/results/eval_summary.json
& $py $d/export_tflite.py --weights ml/recognition-yolo/runs/final-n224/weights/best.pt --stage final --eval-summary ml/recognition-yolo/results/eval_summary.json

# 3) Auditar fotos y verificar el manifiesto
& $py ml/cv_tools.py audit ml/detection/dataset/data/images/train --out ml/recognition-yolo/results/audit_fotos.json
& $py $d/make_manifest.py --verify ml/recognition-yolo/model/machine_recognizer_yolo.manifest.json
& $py -m unittest discover -s ml/recognition-yolo/scripts/tests -v
```

En CPU de 2 núcleos cada entrenamiento tarda ~12 minutos. Con GPU: `--device 0`.

## Resultados medidos (versión `eval`: 32 fotos reales que el modelo no vio)

| Modelo | Top-1 | Top-3 |
|---|---|---|
| Modelo actual de la app (MobileNetV2 + regresión logística) | 2/32 = 6,2 % | 3/32 = 9,4 % |
| YOLO11n-cls v2 | 4/32 = 12,5 % | 10/32 = 31,2 % |

Con confianza ≥ 0,8: YOLO 1 detección y 1 acierto; el modelo actual ninguna detección.
Validación en fotos de catálogo apartadas (66): top-1 ≈ 57 %, top-5 ≈ 86 %; no representa el campo real.

Importante: el `.tflite` entregado es la versión **final**, que además vio esas 32 fotos; no tiene prueba limpia.
Las 32 fotos son pocas (1 a 6 por clase) y de pocos gimnasios: la cifra es orientativa, no una métrica para la tesis.

## Buenas prácticas añadidas (27 de octubre de 2026)

| Qué | Por qué |
|---|---|
| **Split train/val por grupos de casi-duplicados** (`build_dataset.py`, hash perceptual de OpenCV, incluye espejos) | Una misma máquina ya no cae a la vez en train y val. **Las cifras de val ya no son comparables con las de v2.** La métrica honesta sigue siendo `eval` con fotos reales. |
| **`small_class_policy`** (`config.json`) | Las clases con <4 fotos (o un solo grupo) no pueden tener val propia. `augmented_val_copy` (por defecto) crea UNA copia con aumentos de una foto de train para mantener las 35 carpetas en val; esa clase queda marcada en `stats.json → val_sintetica` y **no mide generalización**. `error` conserva el comportamiento estricto anterior. |
| **Catálogo y nombres de foto robustos** (`common.py`) | Acepta `clase--hash.jpg`, `clase-02.jpeg` y `clase.webp`, y busca el catálogo en `ml/detection/dataset/images` o en `.../data/images/train`. Las fotos sin clase del catálogo se omiten y se listan (antes abortaban). |
| **Manifiesto del modelo** (`model/<modelo>.manifest.json`) | sha256 y tamaño del `.tflite`, contrato de entrada/salida, orden de clases (con sha256), umbral de la app, entrenamiento, evaluación **con la etapa a la que pertenece**, advertencias y versiones. `test_manifest.py` falla si el archivo cambia sin regenerarlo. |
| **Verificación del export por probabilidades** | `export_tflite.py` compara la probabilidad de PyTorch y del `.tflite` en 16 fotos reales (recorte idéntico al de la app, OpenCV) + 8 entradas aleatorias; exige suma = 1, rango [0,1] y diferencia máxima ≤ 1e-3. Antes solo comparaba el argmax con ruido. |
| **`training_context.json` + `environment.lock.txt`** por corrida | Versiones exactas de Python/Ultralytics/PyTorch/OpenCV y configuración, como en `ml/detection`. |
| **`ml/cv_tools.py`** | Calidad de imagen (nitidez, exposición, tamaño), casi-duplicados y aumentos fotométricos con OpenCV. Solo offline: la app no ejecuta OpenCV. |

Pendiente que este código **no** resuelve: los archivos de **v3** (`synthetic.py`, `generate_synthetic.py`, `train.py` con
`--synthetic`, `machine_recognizer_yolo_v3.tflite`, `weights/..._v3.pt`, `data/backgrounds/`) viajaron en
`recognition-yolo-v3.zip` y **no están en esta carpeta**; al descomprimirlo hay que fusionar `train.py` y `config.json`
con los de aquí (conservar `small_class_policy`, `near_duplicate_bits` y `write_training_context`) y generar
`machine_recognizer_yolo_v3.manifest.json` con `make_manifest.py`.

## Cómo activarlo en la app (cuando se decida)

1. Medir con fotos propias del gimnasio de validación (ver abajo). Activarlo solo si supera al modelo actual.
2. Copiar `model/machine_recognizer_yolo.tflite` sobre `assets/models/machine_recognizer.tflite`
   (o apuntar `ARCHIVO_MODELO` en `machineRecognition.ts`). El orden de clases ya coincide con `machineLabels.ts`.
3. Recalibrar `CONFIANZA_MINIMA` (hoy 0,8, calibrada para el modelo anterior) y generar un nuevo dev build.
4. Mantenerlo como **sugerencia con confirmación** del usuario, no como detección automática.

## Para tener una cifra defendible en la tesis

- 30–50 fotos por máquina en el gimnasio de validación: una máquina por foto, centrada, sin marcas de agua.
- Reservar ~10 por máquina de **otra sesión o gimnasio** como prueba (`test`) y no entrenar con ellas.
- Agregar clase "ninguna" con fotos sin máquina.
- Subir fotos nuevas con `scripts/clean_branding.py` (si traen logo) y repetir el flujo `eval` → `final`.
