import type { ImagenEjercicioWger } from "@/models/entities/WgerExerciseImage";
import { imagenEjercicioWgerSchema } from "@/schemas/wgerExerciseImage.schema";
import { listar } from "@/services/firebase/firestoreService";

/**
 * Repositorio de `ejerciciosWger/` (Firestore, solo lectura): imágenes de
 * respaldo para los ejercicios de wger sin foto.
 *
 * Son ~130 documentos pequeños, así que se descargan una vez por sesión y se
 * consultan en memoria por id de wger. Si la colección no se puede leer
 * (sin red, aún no cargada) se devuelve vacía: las rutinas siguen mostrando
 * el ícono de siempre.
 */

const COLECCION = "ejerciciosWger";

let indiceEnMemoria: Promise<Map<number, ImagenEjercicioWger>> | null = null;

async function descargarIndice(): Promise<Map<number, ImagenEjercicioWger>> {
  const documentos = await listar<Record<string, unknown>>(COLECCION);
  const indice = new Map<number, ImagenEjercicioWger>();
  for (const documento of documentos) {
    const resultado = imagenEjercicioWgerSchema.safeParse(documento);
    if (!resultado.success) {
      console.warn("Imagen de ejercicio inválida, se omite:", documento.id);
      continue;
    }
    indice.set(resultado.data.wgerId, resultado.data);
  }
  return indice;
}

export async function obtenerImagenRespaldoWger(
  wgerId: number,
): Promise<ImagenEjercicioWger | null> {
  if (!indiceEnMemoria) {
    indiceEnMemoria = descargarIndice().catch((error) => {
      indiceEnMemoria = null; // permitir reintentar en la próxima pantalla
      console.warn("No se pudo leer ejerciciosWger", error?.code ?? error);
      return new Map<number, ImagenEjercicioWger>();
    });
  }
  return (await indiceEnMemoria).get(wgerId) ?? null;
}
