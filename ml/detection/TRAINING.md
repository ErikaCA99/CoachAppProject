# Entrenamiento personalizado de máquinas con YOLOv8

El objetivo es detectar cada máquina con clase y caja en fotos reales de gimnasio.
Se parte de `yolov8n.pt` preentrenado; el CLI de entrenamiento permite únicamente
los detectores YOLOv8 n/s/m/l/x. La versión del paquete `ultralytics` y la familia
del modelo son conceptos distintos: instalar Ultralytics 8.x no basta para
garantizar YOLOv8; aquí lo determina el archivo de pesos inicial.

## Qué significan épocas y batch

Una **época (`epochs`)** recorre el conjunto de entrenamiento. Un **batch** es el
grupo de imágenes procesado por iteración. Por ejemplo, con 280 fotos y batch 8
hay aproximadamente 35 lotes por época; la acumulación de gradientes de Ultralytics
puede agrupar varios lotes antes de actualizar los pesos.

El punto de partida del proyecto es **150 épocas máximas y `patience=30`**. La
parada temprana puede terminar antes si deja de mejorar la métrica de validación.
150 no es un número óptimo probado para estas máquinas. Aumentarlo no compensa
pocas fotos, etiquetas incorrectas o falta de escenas reales.

En CPU empezar con **batch 8** y bajar a 4 si falta memoria. En una GPU CUDA usar
un batch fijo (8 o 16 como prueba inicial) o `--batch -1`; también se admite una
fracción, por ejemplo `--batch 0.7`. AutoBatch perfila memoria y el batch que elige
depende del dispositivo y del modelo. El pipeline limita AutoBatch a una GPU
explícita (`--device 0`). No se ha detectado/verificado CUDA en este entorno.
Un batch mayor no garantiza mayor precisión. Registrar el batch efectivo de
`training_context.json` al comparar experimentos.

Fuentes oficiales para estos parámetros:
[modo Train](https://docs.ultralytics.com/modes/train/) y
[consejos de entrenamiento](https://docs.ultralytics.com/guides/model-training-tips/).

## Configuración inicial para este proyecto

`train_config.json` es una propuesta inicial, pendiente de validación con tus datos:

- `imgsz=640`, YOLOv8n: primera referencia para el objetivo móvil. Probar YOLOv8s
  después, midiendo también latencia en el teléfono; no asumir que un modelo más
  grande será adecuado para tiempo real.
- `optimizer=AdamW`, `lr0=0.001`, `weight_decay=0.0005`, warmup de 3 épocas y
  programación coseno. Se fija el optimizador para que `lr0` tenga efecto.
- `mosaic=0.5`, `close_mosaic=10`, `mixup=0`: punto de partida moderado. El cierre
  se programa para las últimas 10 épocas del máximo; si hay parada temprana antes
  de ese tramo, no significa que el modelo haya pasado por él.
- Variación de brillo/saturación de 0.3, rotación hasta 5 grados, escala 0.3 y
  traslación 0.1. Espejo horizontal 0.5 y vertical 0: simular variación plausible
  sin entrenar con máquinas invertidas. Revisar los ejemplos aumentados.
- `workers=0` facilita el arranque en Windows. Tras comprobar estabilidad, probar
  `--workers 2`. `cache=false` evita reservar RAM adicional de entrada.
- `seed=42`, `deterministic=true`, AMP habilitado cuando el backend lo permite.
  Misma semilla no garantiza resultados idénticos entre hardware/versiones.

Los aumentos modifican también las cajas y se aplican únicamente al entrenamiento.
Para cambiar su intensidad, copiar el JSON, editarlo y pasar `--config ruta.json`.
No se aplican parámetros exclusivos de clasificación, como dropout, al detector.
Consultar [aumentos de Ultralytics](https://docs.ultralytics.com/guides/yolo-data-augmentation/).

## Primero mejorar las imágenes y anotaciones

El estado local comprobado es 397 fotos únicas de 35 clases y cero anotaciones.
`palanca-peso-muerto` y `escaladora` tienen una foto cada una; `remo-t` tiene dos.
El mínimo de tres fotos por clase solo permite construir tres particiones: no
es una cantidad suficiente para demostrar generalización.

Priorizar fotos tomadas con el teléfono en gimnasios: máquinas de distintos
fabricantes, vistas frontal/lateral/oblicua, distancias, personas, oclusiones,
iluminación y fondos distintos. Añadir escenas con varias máquinas y negativos
reales sin ninguna clase objetivo. Evitar muchos frames casi idénticos del mismo
video. Las imágenes limpias de catálogo pueden complementar esas fotos.

Anotar **todas** las máquinas objetivo visibles con cajas ajustadas y mantener
la misma definición de clase. Revisar especialmente familias parecidas como
press-pecho, press-hombro y máquinas combinadas. Un TXT vacío significa una imagen
revisada sin objetos; un TXT ausente significa que falta anotarla.

Mantener la organización por las carpetas del catálogo al ampliar la fuente y
preparar una nueva versión con `--dataset ruta-nueva`. Las fotos con varias clases
pueden estar bajo una clase principal; sus TXT deben contener todas las cajas.
Los negativos revisados pueden acompañar la carpeta de su sesión. No duplicar
escenas en varias carpetas para representar varias clases.

Referencia del formato: [datasets de detección](https://docs.ultralytics.com/datasets/detect/).

## Separación por sesión o ejemplar

Las imágenes de la misma máquina física, sesión o video deben permanecer juntas.
Si se desea medir generalización a gimnasios nuevos, reservar gimnasios completos.
Crear un JSON con una entrada por nombre exacto de imagen del manifest:

```json
{
  "nombre-real-1.jpg": {"grupo": "gym-a-prensa-01", "split": "train"},
  "nombre-real-2.jpg": {"grupo": "gym-a-prensa-01", "split": "train"},
  "nombre-real-3.jpg": {"grupo": "gym-b-prensa-03", "split": "val"},
  "nombre-real-4.jpg": {"grupo": "gym-c-prensa-02", "split": "test"}
}
```

Los nombres anteriores son ilustrativos. El plan real debe cubrir todas las fotos
y todas las clases deben tener cajas en train, val y test. Apuntar aproximadamente
a 70/15/15 por cantidad de imágenes, respetando primero los grupos; no dividir un
grupo para lograr un porcentaje exacto. El comando no sobrescribe un split previo.

```powershell
python ml/detection/pipeline.py build --split-plan ruta-al-plan.json
python ml/detection/pipeline.py audit
```

`audit` detecta anotaciones pendientes, cajas inválidas, clases ausentes,
duplicados exactos entre particiones y etiquetas modificadas después de construir
el split. No puede descubrir por sí solo qué fotos pertenecen al mismo ejemplar:
la calidad de los grupos requiere revisión humana.

## Ejecutar y comparar

Desde la raíz del proyecto, instalar el entorno de `ml/README.md`. Antes de
descargar pesos o entrenar, comprobar los parámetros sin necesitar PyTorch:

```powershell
python ml/detection/pipeline.py train --dry-run
python ml/detection/pipeline.py train --dry-run --device 0 --batch 0.7
```

`dry-run` imprime el estado y no inicia entrenamiento aunque el dataset no esté
listo. Un entrenamiento real sí se detiene ante errores del dataset.

Después de anotar y construir las particiones, hacer una prueba corta de ejecución:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py train --epochs 5 --patience 3 --close-mosaic 0 --batch 4 --device cpu --name prueba-corta
```

Es una prueba técnica; cinco épocas no demuestran buena precisión. Entrenamiento base:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py train --epochs 150 --patience 30 --batch 8 --device cpu --name v8n-base
```

Alternativa con una GPU CUDA disponible y PyTorch compatible:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py train --device 0 --batch -1 --name v8n-cuda
```

Cada ejecución guarda `args.yaml`, `results.csv`, gráficos de entrenamiento,
`weights/best.pt`, `weights/last.pt`, `validation.json`, `training_context.json`
y `environment.lock.txt`. Se conserva tanto la configuración solicitada como el
batch efectivo y huellas del dataset; no sobrescribir estas evidencias. El rango
de versiones de requirements permite instalar el entorno, mientras que el lock
de cada corrida documenta sus versiones reales.

Comparar una variable a la vez sobre las mismas particiones: primero la referencia,
después batch 8/16 si caben, luego YOLOv8s o un cambio de aumentos. Examinar precisión,
recall y mAP50-95 por clase, confusiones y ejemplos fallidos. Si la pérdida de train
baja y val empeora, revisar sobreajuste y datos antes de añadir épocas. Elegir el
experimento en **val** y reservar **test** hasta fijar la configuración final:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py evaluate --model ml/detection/runs/v8n-base/weights/best.pt --split test --batch 8 --device cpu
```

Si se cambia `imgsz`, usar el mismo valor en `evaluate` y `export`. El umbral de
confianza para la cámara se ajusta después con validación; subirlo no mejora el
modelo, cambia el equilibrio entre detecciones falsas y objetos omitidos.

No se ha entrenado ni medido una mejora con esta configuración todavía. La
integración Android y la prueba de latencia siguen siendo etapas posteriores.

## Carpeta estilo "video" sin fuga (`yolo-folder`) y entrenamiento en Colab

El video de YOLOv5 pide una carpeta `data/` con `images` y `labels` divididas en `train` y `val` y un `.yaml`.
`dataset/data/` (la que salió de `data.zip`) **no cumple eso de forma fiable**: las 405 etiquetas son clase 0
(una caja por foto), `labels/val` es idéntica a `labels/train` y `images/val` repite las fotos de train, así que
val no mide nada. `yolo-folder` la reconstruye:

```powershell
python ml/detection/pipeline.py yolo-folder --source ml/detection/dataset/data --output ml/detection/dataset/yolo-v8
python ml/detection/pipeline.py yolo-folder --output ml/detection/dataset/yolo-v8 --check-only
```

- Divide por **grupos de fotos casi idénticas** (hash perceptual con OpenCV, incluye espejos), 70/15/15, semilla 42.
  Las clases con menos de 3 grupos (`escaladora`, `palanca-peso-muerto`, `remo-t`...) van enteras a train y quedan
  avisadas en `dataset-manifest.json`.
- Si **todas** las etiquetas son clase 0, crea un detector de **una clase (`maquina`)**. Para distinguir las 35
  máquinas hacen falta cajas con su clase (`annotate`) o un segundo paso de clasificación sobre el recorte
  (`ml/recognition-yolo`).
- `data.yaml` **no lleva `path:`**: Ultralytics resuelve un `path` relativo contra su carpeta de datasets, no contra
  el YAML. Sin `path` usa la carpeta del YAML y funciona igual en Windows, Linux y Colab.
- `dataset-manifest.json` guarda sha256 de cada foto/etiqueta, grupo, partición y advertencias; `--check-only`
  detecta cualquier cambio posterior, duplicados entre particiones y grupos repartidos.
- `--augment-copies N` añade N copias con aumentos fotométricos de OpenCV (luz, sombra, desenfoque, ruido, JPEG,
  CLAHE) **solo a train**; no mueven píxeles, así que las cajas siguen valiendo.

Entrenar con esa carpeta, en el PC o en Colab:

```powershell
ml/detection/.venv/Scripts/python.exe ml/detection/pipeline.py train --data-yaml ml/detection/dataset/yolo-v8/data.yaml --epochs 5 --patience 3 --close-mosaic 0 --batch 4 --name prueba-corta
```

Para GPU gratis: sube `yolo-v8.zip` a `ml/detection/colab_yolov8_train.ipynb` (mismos pasos del video, con
TensorBoard, `best.pt`, inferencia con caja/clase/confianza y evaluación en test una sola vez).
`pipeline.py export` escribe `<modelo>.manifest.json` junto al `.tflite`.

**OpenCV, qué hace y qué no.** Mejora los *datos* y la *verificación*: descarta o avisa de fotos borrosas, oscuras o
diminutas (`python ml/cv_tools.py audit RUTA`), evita fugas por casi-duplicados, aumenta con ruido realista y filtra
fotogramas movidos en `realtime` (`--min-sharpness`). No sustituye fotos reales de gimnasio, que siguen siendo lo
que más mueve la precisión. La app móvil no ejecuta OpenCV, por eso nada de esto debe ser un paso de inferencia.

## Comprobaciones del código

```powershell
python -m unittest discover -s ml/detection/tests -v
python -m unittest discover -s ml/tests -v
```

Son pruebas de `unittest`; las de OpenCV (`yolo_folder`, `cv_tools`) se omiten solas si `opencv-python` no está instalado.
Verifican argumentos, cajas inválidas, particiones, grupos, anotaciones cambiadas y
que el entrenamiento seleccione modelos con val en lugar de test. La prueba del
flujo de entrenamiento usa un doble de Ultralytics; no mide precisión del detector.

Referencia del modelo: [documentación de YOLOv8](https://docs.ultralytics.com/models/yolov8/).
