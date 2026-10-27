# ML de coach-app

Hay dos tareas independientes: recomendación de rutinas (`train_routine_model.py`)
y visión de máquinas. La visión tiene un clasificador existente y un nuevo flujo
de detección en `detection/`. No sustituir uno por otro sin adaptar su contrato.

Para ajustar épocas, batch, aumentos y comparar experimentos con YOLOv8, seguir
[la guía de entrenamiento personalizado](detection/TRAINING.md). La configuración
inicial versionada está en `detection/train_config.json`.

## Estado comprobado (26 de octubre de 2026)

- `train_machine_recognition.py`: MobileNetV2 con softmax, 35 clases. Entrada
  RGB float32 `[1,224,224,3]`, salida `[1,35]`. Clasifica una imagen completa;
  sus alternativas top-3 no representan tres objetos detectados.
- `src/services/ai/machineRecognition.ts`: prepara una foto mediante recorte
  central y ejecuta el clasificador TFLite. No devuelve cajas ni coordenadas.
- `src/app/(app)/machines/scanner.tsx`: captura manual con `takePictureAsync`;
  no procesa continuamente los frames de la cámara.
- Las métricas guardadas en `results/recognition/recognition_metrics.json`
  corresponden a clasificación y campo simulado, no a detección ni pruebas de
  rendimiento en un teléfono. No sirven para afirmar precisión en gimnasio.
- `detection/pipeline.py`: preparación de fotos, anotación de cajas, validación,
  particiones reproducibles, entrenamiento YOLO, evaluación test, inferencia con
  webcam/video y exportación TFLite. El detector aún necesita anotaciones y
  entrenamiento; no hay resultados reales de detección que reportar.

## Objetivo de detección

Detectar cero, una o varias máquinas por frame, incluso varias de una misma
clase, devolviendo por objeto `maquinaId`, confianza, caja `[x1,y1,x2,y2]` y centro
`[x,y]` en píxeles de la imagen original. Se mantienen los 35 IDs del catálogo.
Una escena sin máquinas puede producir cero detecciones; no se fuerza una clase.

Estas son posiciones **2D en la imagen**, no coordenadas físicas XYZ ni distancia
en metros. La localización 3D exige profundidad/calibración y otro diseño.

## Referencia y adaptación

Referencia: [Shopping-AI de AprendeIngenia](https://github.com/AprendeIngenia/Shopping-AI),
especialmente `python_files/ShoppingIA.py`. Se toma como guía del ciclo cámara →
inferencia → localización → visualización. Sus clases de compras y sus pesos no
se reutilizan para identificar máquinas de gimnasio. Este pipeline es propio,
no copia su aplicación de tienda.

La [documentación de detección de Ultralytics](https://docs.ultralytics.com/tasks/detect/)
define las salidas con cajas, clases y confianza y los modos de entrenamiento y
validación. Se usa YOLOv8n como punto de partida pequeño; los pesos COCO iniciales
no reconocen por sí solos las 35 máquinas. Para distribuir el detector, revisar
la licencia de Ultralytics y los derechos de las fotos originales.

## Pasos para ejecutar (PowerShell, desde la raíz de coach-app)

El entorno Python es independiente del proyecto Expo. No cambia `package.json`,
`app.json` ni `tsconfig.json`.

```powershell
python -m venv ml/detection/.venv
ml/detection/.venv/Scripts/python.exe -m pip install -r ml/detection/requirements.txt
ml/detection/.venv/Scripts/python.exe -m pip freeze > ml/detection/environment.lock.txt
```

1. Preparar las fotos de todas las clases:

```powershell
python ml/detection/pipeline.py prepare --source "D:/Maquinas de Gimnasio/35-maquinas"
```

Ya ejecutado en este entorno. `detection/dataset/v8-35/manifest.json` conserva origen,
hash y clase sugerida. Se convierten fotos estáticas a JPEG, se corrige orientación
EXIF, se eliminan duplicados exactos y se registran incidencias. Los originales
permanecen intactos. No se generan cajas ficticias de imagen completa ni se usan
GIFs de ejercicios. Las imágenes generadas se mantienen locales, fuera de Git.
`prepare` exige una carpeta destino nueva para evitar sobrescribir trabajo.

Preparación realizada: **397 fotos únicas, 35 clases, cero incidencias de lectura**.
Esta versión no contiene ninguna anotación válida para entrenamiento de detección.
Hay carpetas históricas `images/train|val` y `labels/train|val` con asignación de
clase 0 a todas las cajas, archivos sin imagen correspondiente y al menos una
caja de tamaño cero; el audit las rechaza y el flujo nuevo usa la ruta aislada
`dataset/v8-35`. Faltan cajas manuales en las 397 fotos del manifiesto. Además, `palanca-peso-muerto` y
`escaladora` tienen una foto cada una; `remo-t` tiene dos. Añadir originales
independientes antes de construir las tres particiones; duplicar o aumentar esa
misma foto no resuelve la falta de datos de evaluación.

2. Anotar todas las máquinas visibles en cada imagen:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py annotate
```

Arrastrar rectángulos completos alrededor de cada máquina, Enter confirma una caja,
Esc finaliza selección. En la terminal indicar la clase de cada caja (Enter acepta
la sugerida por carpeta). En la ventana, `s` guarda cajas, `n` confirma una imagen
sin objetos, `q` sale; otra tecla omite. Las anotaciones existentes se conservan.
Para corregir una anotación, respaldar y retirar su TXT antes de volver a anotar.
Formato YOLO: `clase centro_x centro_y ancho alto`, coordenadas normalizadas 0..1.

3. Validar y separar originales en entrenamiento/validación/prueba:

```powershell
python ml/detection/pipeline.py build
```

El comando exige anotación explícita por foto, valida clases y cajas, verifica
presencia de cajas de todas las clases en las tres particiones y genera `data.yaml`.
La semilla es 42; se reserva aproximadamente 15 % para validación y 15 % para test
por carpeta original. Fotos duplicadas exactas no cruzan particiones. Para una
evaluación real, usar `build --split-plan ruta-al-plan.json`: asigna cada foto a un
grupo de sesión/ejemplar y una partición, y rechaza grupos que crucen particiones.
La separación automática por foto queda disponible para prototipos; no evita fuga
entre tomas similares. Los aumentos se aplican después del split, solo al entrenar.

4. Entrenar y evaluar:

```powershell
python ml/detection/pipeline.py train --dry-run
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py train --epochs 150 --patience 30 --batch 8 --device cpu
```

Para una GPU CUDA compatible, usar `--device 0`. Se descargan pesos iniciales.
Resultados en `detection/runs/maquinas*/`, pesos `weights/best.pt` y evaluación
`validation.json` con precisión, recall y mAP por clase sobre **val**. Cada ejecución
guarda parámetros, batch efectivo, versiones y huellas del dataset. Consultar test
solo tras fijar el experimento final con `evaluate --model ruta/best.pt --split test`.
El mínimo técnico de tres fotos
por clase no equivale a suficientes datos: añadir fotos reales, distintos ángulos,
fondos, luz, oclusiones, escenas con varias máquinas y negativos sin máquinas.

5. Practicar inferencia continua con cámara de PC:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py realtime --model ml/detection/runs/maquinas/weights/best.pt --source 0
```

También acepta un video como `--source`. Muestra las cajas y latencia; guarda
`detection/detections.jsonl` con todas las detecciones y coordenadas por frame.
Usar `--output otra-ruta.jsonl` en la siguiente ejecución, porque no sobrescribe
evidencia previa. La latencia indicada mide inferencia; medir FPS del ciclo completo
por separado y en el dispositivo objetivo antes de afirmar tiempo real usable.

6. Exportar para estudiar integración Android:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py export --model ml/detection/runs/maquinas/weights/best.pt
```

La exportación puede necesitar TensorFlow y dependencias adicionales de Ultralytics.
No copia ni reemplaza `assets/models/machine_recognizer.tflite`.

## Integración Android pendiente

La demostración Python usa la webcam de PC, no la cámara del teléfono. Tras entrenar:

- Inspeccionar entrada/salida y cuantización del TFLite exportado. Implementar
  letterbox y su transformación inversa, normalización y decodificador YOLO/NMS
  conforme a sus tensores reales. El contrato `[1,35]` actual no es compatible.
- Crear servicio de detección y exponerlo mediante `MachinesController`; la Vista
  dibuja todas las cajas con el ajuste de rotación, escala, espejo y recorte.
- Integrar captura continua nativa con control de concurrencia: un frame en vuelo,
  descarte de frames atrasados, suspensión al salir y liberación de recursos.
- Validar en development build Android las dependencias nativas y permisos;
  medir latencia, FPS, memoria y comportamiento térmico en el teléfono real.
- Evaluar escenas reales con varias máquinas y cero objetos; documentar precisión,
  recall y mAP por clase. No presentar el clasificador actual como detector.

No se declara completada esta integración ni el entrenamiento mientras falten
anotaciones, pesos entrenados y evidencia de ejecución real.

Verificado: ejecución de preparación, cobertura de las 35 clases, pruebas de
configuración, separación de datos y rechazo de imágenes sin anotaciones. No se ejecutaron
anotación interactiva, entrenamiento, exportación TFLite ni cámara: el entorno
Python actual no tiene instalados Ultralytics, PyTorch ni OpenCV.

## Reconocimiento con YOLO11n-cls (v2)

El pipeline de entrenamiento, evaluación y exportación del clasificador YOLO11n-cls está en
[`recognition-yolo/`](recognition-yolo/README.md): scripts reproducibles, 32 fotos reales de gimnasios,
resultados y un `.tflite` con el mismo contrato que `machine_recognizer.tflite`. No está conectado a la
app: ver ese README para el mapeo MVC y los pasos de activación.

## Herramientas compartidas de visión (OpenCV)

- [`cv_tools.py`](cv_tools.py): calidad de imagen, casi-duplicados, aumentos fotométricos y recorte idéntico al de la app.
  `python ml/cv_tools.py audit RUTA_FOTOS --out informe.json`. Solo para uso offline.
- [`model_manifest.py`](model_manifest.py): manifiesto de modelo (`<modelo>.manifest.json`) y su verificación.
  `python ml/model_manifest.py verify RUTA/modelo.manifest.json --labels ml/results/recognition/labels.json`.
- [`requirements.lock.txt`](requirements.lock.txt): versiones exactas probadas del entorno.
- Entrenar el detector en Colab: [`detection/colab_yolov8_train.ipynb`](detection/colab_yolov8_train.ipynb);
  carpeta estilo video sin fuga: `python ml/detection/pipeline.py yolo-folder` (ver `detection/TRAINING.md`).
