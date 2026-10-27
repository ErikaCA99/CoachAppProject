import type { ResultadoReconocimiento } from "@/services/ai/machineRecognition";

export type { ResultadoReconocimiento } from "@/services/ai/machineRecognition";
export const CONFIANZA_MINIMA = 0.8;

/** La ficha web mantiene la selección manual sin cargar Nitro ni TensorFlow Lite. */
export async function reconocerMaquina(
  _fotoUri: string,
): Promise<ResultadoReconocimiento | null> {
  return null;
}
