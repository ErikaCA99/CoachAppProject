import { buscarAnimacionesExerciseDb } from "@/services/exercisedb/exerciseDbService";
import { normalizarTexto } from "@/utils/text";

export interface AnimacionAlternativa {
  id: string;
  nombre: string;
  url: string;
}

/** Solo igualdad de nombre: no cambia el mapeo manual del catálogo. */
export async function obtenerAnimacionExacta(
  nombreOriginal: string,
  signal: AbortSignal,
): Promise<AnimacionAlternativa | null> {
  if (!nombreOriginal.trim()) return null;
  const resultados = await buscarAnimacionesExerciseDb(nombreOriginal, signal);
  const coincidencias = resultados.filter(
    (ejercicio) =>
      normalizarTexto(ejercicio.name) === normalizarTexto(nombreOriginal),
  );
  if (coincidencias.length !== 1) return null;
  const ejercicio = coincidencias[0];
  return {
    id: ejercicio.exerciseId,
    nombre: ejercicio.name,
    url: ejercicio.gifUrl,
  };
}
