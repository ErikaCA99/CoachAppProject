import { Buffer } from "buffer";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode as decodificarJpeg } from "jpeg-js";
import type { TfliteModel } from "react-native-fast-tflite";
import {
  respuestaReconocimientoSchema,
  type CajaDeteccion,
} from "@/features/machines/model/schemas/machineRecognition.schema";

import { ETIQUETAS_MAQUINAS } from "@/features/machines/model/rules/machineLabels";
import { invocarFuncion } from "@/core/http/callable";

/**
 * Reconocimiento de máquinas por cámara (TensorFlow Lite, on-device).
 *
 * Modelo: MobileNetV2 (ImageNet) + capa softmax entrenada con las fotos de
 * catálogo de las 35 máquinas (`ml/train_machine_recognition.py`).
 * Las clases son los ids del catálogo (`maquinas/{id}`), en el orden de
 * `ETIQUETAS_MAQUINAS`.
 *
 * Entrada: float32 [1, 224, 224, 3], RGB 0..255 (la normalización de
 * MobileNetV2 va dentro del modelo). Salida: float32 [1, 35] probabilidades.
 *
 * Modo nube (opcional): con `EXPO_PUBLIC_RECONOCIMIENTO_NUBE=true` la foto se
 * envía a la Cloud Function `reconocerMaquina`, que consulta el endpoint de
 * Ultralytics con la clave guardada en Secret Manager (nunca en el APK). Si la
 * llamada falla (sin internet, cuota, servicio caído) se usa este modelo local.
 * Si el servicio responde pero no reconoce ninguna máquina del catálogo, se
 * devuelve `null` y el escáner cae en la selección manual.
 *
 * Importante: los términos de WorkoutX prohíben entrenar modelos con sus GIFs
 * sin permiso escrito; el dataset sale solo de las fotos de catálogo.
 */

export interface ResultadoReconocimiento {
  maquinaId: string;
  /** 0..1 */
  confianza: number;
  caja?: CajaDeteccion;
  /** Las siguientes candidatas (top-3 sin incluir la primera). */
  alternativas: {
    maquinaId: string;
    confianza: number;
    caja?: CajaDeteccion;
  }[];
}

/**
 * Umbral mínimo para aceptar una predicción sin pedir confirmación.
 * Calibrado en validación cruzada (`ml/results/recognition/recognition_metrics.json`):
 * con 0,8 la detección automática acierta ~85 % de las veces y se usa en
 * ~16 % de las capturas; el resto pide confirmar con la sugerencia preseleccionada.
 */
export const CONFIANZA_MINIMA = 0.8;

const TAM = 224;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARCHIVO_MODELO = require("@/assets/models/machine_recognizer.tflite");

let modeloPromesa: Promise<TfliteModel> | null = null;

function obtenerModelo(): Promise<TfliteModel> {
  if (!modeloPromesa) {
    modeloPromesa = import("react-native-fast-tflite")
      .then(({ loadTensorflowModel }) =>
        loadTensorflowModel(ARCHIVO_MODELO, []),
      )
      .catch((error) => {
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

const NUBE_ACTIVA = process.env.EXPO_PUBLIC_RECONOCIMIENTO_NUBE === "true";
/** Lado mayor de la foto enviada a la nube (el JPEG pesa ~50–120 KB). */
const LADO_NUBE = 640;

/** Foto completa (sin recorte) reducida y en JPEG base64 para el endpoint. */
async function prepararFotoNube(fotoUri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(fotoUri).renderAsync();
  const reducida = await ImageManipulator.manipulate(original)
    .resize(
      original.width >= original.height
        ? { width: LADO_NUBE }
        : { height: LADO_NUBE },
    )
    .renderAsync();
  const { base64 } = await reducida.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: true,
  });
  if (!base64) throw new Error("No se pudo leer la foto");
  return base64;
}

async function reconocerEnNube(
  fotoUri: string,
): Promise<ResultadoReconocimiento | null> {
  const imagenBase64 = await prepararFotoNube(fotoUri);
  const { sugerencias } = await invocarFuncion(
    "reconocerMaquina",
    { imagenBase64 },
    respuestaReconocimientoSchema,
    // El endpoint gratuito escala a cero: el primer arranque puede tardar.
    { timeoutMs: 55000 },
  );
  const catalogo = new Set(ETIQUETAS_MAQUINAS);
  const validas = sugerencias.filter((s) => catalogo.has(s.maquinaId));
  if (validas.length === 0) {
    // El servicio respondió, pero YOLO no vio ninguna máquina del catálogo.
    console.info("Reconocimiento en la nube: sin máquinas del catálogo.");
    return null;
  }
  const [mejor, ...resto] = validas;
  return {
    maquinaId: mejor.maquinaId,
    confianza: mejor.confianza,
    caja: mejor.caja,
    alternativas: resto.slice(0, 2),
  };
}

export async function reconocerMaquina(
  fotoUri: string,
): Promise<ResultadoReconocimiento | null> {
  // Diagnóstico: EXPO_PUBLIC_* se incrusta al empaquetar; si sale "local"
  // con el .env en true, reinicia Metro con `npx expo start -c`.
  console.info(`[reconocimiento] modo: ${NUBE_ACTIVA ? "nube" : "local"}`);
  if (NUBE_ACTIVA) {
    try {
      return await reconocerEnNube(fotoUri);
    } catch (error) {
      console.warn("Reconocimiento en la nube no disponible:", error);
    }
  }
  return reconocerLocal(fotoUri);
}

async function reconocerLocal(
  fotoUri: string,
): Promise<ResultadoReconocimiento | null> {
  try {
    const [modelo, entrada] = await Promise.all([
      obtenerModelo(),
      prepararEntrada(fotoUri),
    ]);
    const [salida] = await modelo.run([entrada.buffer as ArrayBuffer]);
    const probabilidades = Array.from(new Float32Array(salida));
    if (
      probabilidades.some(
        (valor) => !Number.isFinite(valor) || valor < 0 || valor > 1,
      )
    ) {
      throw new Error("El modelo devolvió probabilidades inválidas.");
    }
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
