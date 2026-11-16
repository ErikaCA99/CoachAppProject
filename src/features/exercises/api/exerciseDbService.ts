import { fetch } from "expo/fetch";
import { z } from "zod";

const respuestaSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      exerciseId: z.string().min(1),
      name: z.string().min(1),
      gifUrl: z
        .string()
        .url()
        .refine((url) => {
          const destino = new URL(url);
          return (
            destino.protocol === "https:" &&
            destino.hostname === "static.exercisedb.dev"
          );
        }),
    }),
  ),
});

/** Consulta pública: sin claves ni almacenamiento persistente del contenido. */
export async function buscarAnimacionesExerciseDb(
  nombre: string,
  signal: AbortSignal,
) {
  const respuesta = await fetch(
    `https://oss.exercisedb.dev/api/v1/exercises/search?search=${encodeURIComponent(nombre)}`,
    { signal },
  );
  if (!respuesta.ok) {
    throw new Error(
      respuesta.status === 429
        ? "ExerciseDB alcanzó su límite de consultas. Inténtalo más tarde."
        : "No se pudo consultar ExerciseDB. Inténtalo de nuevo.",
    );
  }
  return respuestaSchema.parse(await respuesta.json()).data;
}
