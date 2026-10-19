import {
  loadTensorflowModel,
  type TfliteModel,
} from "react-native-fast-tflite";

import { NUM_FEATURES } from "@/services/ai/features";

/**
 * Servicio de inferencia on-device del recomendador de rutinas (TensorFlow
 * Lite vía `react-native-fast-tflite`). Sin reglas de negocio: carga el
 * modelo, ejecuta y devuelve las probabilidades crudas.
 *
 * Contrato del modelo (ver `ml/results/model_metadata.json`):
 *   entrada: float32 [1, 10]  (features.ts, VERSION_FEATURES = 1)
 *   salida:  float32 [1, 10]  → [0:6] plantilla, [6:10] esquema
 */

export const VERSION_MODELO = "1.1.0";
const NUM_PLANTILLAS = 6;
const NUM_ESQUEMAS = 4;

// El `require` del .tflite lo resuelve Metro (assetExts incluye "tflite").
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARCHIVO_MODELO = require("../../../assets/models/routine_recommender.tflite");

let modeloPromesa: Promise<TfliteModel> | null = null;

/** Carga perezosa y única del modelo (reintenta si una carga anterior falló). */
function obtenerModelo(): Promise<TfliteModel> {
  if (!modeloPromesa) {
    modeloPromesa = loadTensorflowModel(ARCHIVO_MODELO, []).catch((error) => {
      modeloPromesa = null;
      throw error;
    });
  }
  return modeloPromesa;
}

export interface SalidaModelo {
  probabilidadesPlantilla: number[];
  probabilidadesEsquema: number[];
}

export async function inferirRutina(
  features: Float32Array,
): Promise<SalidaModelo> {
  if (features.length !== NUM_FEATURES) {
    throw new Error(`Entrada inválida: ${features.length} != ${NUM_FEATURES}`);
  }
  const modelo = await obtenerModelo();
  // fast-tflite v3 trabaja con ArrayBuffer: copiamos para no compartir memoria.
  const [salida] = await modelo.run([features.slice().buffer]);
  const valores = Array.from(new Float32Array(salida));
  if (valores.length !== NUM_PLANTILLAS + NUM_ESQUEMAS) {
    throw new Error(`Salida inesperada del modelo: ${valores.length} valores`);
  }
  return {
    probabilidadesPlantilla: valores.slice(0, NUM_PLANTILLAS),
    probabilidadesEsquema: valores.slice(NUM_PLANTILLAS),
  };
}
