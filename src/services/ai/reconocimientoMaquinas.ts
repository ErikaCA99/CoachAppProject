import { Buffer } from "buffer";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode as decodificarJpeg } from "jpeg-js";
import {
  loadTensorflowModel,
  type TfliteModel,
} from "react-native-fast-tflite";

import { ETIQUETAS_MAQUINAS } from "@/services/ai/etiquetasMaquinas";

/**
 * Reconocimiento de máquinas por cámara (TensorFlow Lite, on-device).
 *
 * Modelo: MobileNetV2 (ImageNet) + capa softmax entrenada con las fotos de
 * catálogo de las 35 máquinas (`ml/entrenar_reconocimiento_maquinas.py`).
 * Las clases son los ids del catálogo (`maquinas/{id}`), en el orden de
 * `ETIQUETAS_MAQUINAS`.
 *
 * Entrada: float32 [1, 224, 224, 3], RGB 0..255 (la normalización de
 * MobileNetV2 va dentro del modelo). Salida: float32 [1, 35] probabilidades.
 *
 * Importante: los términos de WorkoutX prohíben entrenar modelos con sus GIFs
 * sin permiso escrito; el dataset sale solo de las fotos de catálogo.
 */

export interface ResultadoReconocimiento {
  maquinaId: string;
  /** 0..1 */
  confianza: number;
  /** Las siguientes candidatas (top-3 sin incluir la primera). */
  alternativas: { maquinaId: string; confianza: number }[];
}

/**
 * Umbral mínimo para aceptar una predicción sin pedir confirmación.
 * Calibrado en validación cruzada (`ml/resultados/reconocimiento/metricas_reconocimiento.json`):
 * con 0,8 la detección automática acierta ~85 % de las veces y se usa en
 * ~16 % de las capturas; el resto pide confirmar con la sugerencia preseleccionada.
 */
export const CONFIANZA_MINIMA = 0.8;

const TAM = 224;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARCHIVO_MODELO = require("../../../assets/models/machine_recognizer.tflite");

let modeloPromesa: Promise<TfliteModel> | null = null;

function obtenerModelo(): Promise<TfliteModel> {
  if (!modeloPromesa) {
    modeloPromesa = loadTensorflowModel(ARCHIVO_MODELO, []).catch((error) => {
      modeloPromesa = null;
      throw error;
    });
  }
  return modeloPromesa;
}

/** Recorte cuadrado central → 224×224 → píxeles RGB float32 (0..255). */
async function prepararEntrada(fotoUri: string): Promise<Float32Array> {
  const original = await ImageManipulator.manipulate(fotoUri).renderAsync();
  const lado = Math.min(original.width, original.height);
  const cuadrado = await ImageManipulator.manipulate(original)
    .crop({
      originX: Math.floor((original.width - lado) / 2),
      originY: Math.floor((original.height - lado) / 2),
      width: lado,
      height: lado,
    })
    .resize({ width: TAM, height: TAM })
    .renderAsync();
  const { base64 } = await cuadrado.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.92,
    base64: true,
  });
  if (!base64) throw new Error("No se pudo leer la foto");

  const { data, width, height } = decodificarJpeg(
    Buffer.from(base64, "base64"),
    {
      useTArray: true,
      formatAsRGBA: false,
    },
  );
  if (width !== TAM || height !== TAM) {
    throw new Error(`Tamaño inesperado: ${width}×${height}`);
  }
  return Float32Array.from(data); // [224*224*3] en orden RGB
}

export async function reconocerMaquina(
  fotoUri: string,
): Promise<ResultadoReconocimiento | null> {
  try {
    const [modelo, entrada] = await Promise.all([
      obtenerModelo(),
      prepararEntrada(fotoUri),
    ]);
    const [salida] = await modelo.run([entrada.buffer as ArrayBuffer]);
    const probabilidades = Array.from(new Float32Array(salida));
    if (probabilidades.length !== ETIQUETAS_MAQUINAS.length) {
      throw new Error(
        `El modelo devolvió ${probabilidades.length} clases y hay ${ETIQUETAS_MAQUINAS.length} etiquetas`,
      );
    }

    const ranking = probabilidades
      .map((confianza, i) => ({ maquinaId: ETIQUETAS_MAQUINAS[i], confianza }))
      .sort((a, b) => b.confianza - a.confianza);
    const [mejor, ...resto] = ranking;
    return {
      maquinaId: mejor.maquinaId,
      confianza: mejor.confianza,
      alternativas: resto.slice(0, 2),
    };
  } catch (error) {
    // Sin modelo o con error: el escáner cae en la selección manual.
    console.warn("Reconocimiento de máquina no disponible:", error);
    return null;
  }
}
