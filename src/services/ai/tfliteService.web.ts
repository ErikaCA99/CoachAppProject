import type { SalidaModelo } from "@/services/ai/tfliteService";

export type { SalidaModelo } from "@/services/ai/tfliteService";
export const VERSION_MODELO = "1.1.0";

/** El planificador usa su respaldo heurístico en plataformas sin el módulo nativo. */
export async function inferirRutina(
  _features: Float32Array,
): Promise<SalidaModelo> {
  throw new Error("TensorFlow Lite requiere la aplicación nativa.");
}
