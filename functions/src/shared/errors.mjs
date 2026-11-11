import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

/** Valida con Zod; cualquier fallo es `invalid-argument` sin detalles. */
export function validar(schema, datos) {
  const resultado = schema.safeParse(datos);
  if (!resultado.success)
    throw new HttpsError(
      "invalid-argument",
      "Los datos enviados no son válidos.",
    );
  return resultado.data;
}

/** Ejecuta la operación y convierte errores inesperados en `internal` sin filtrar datos. */
export async function seguro(operacion, tarea) {
  try {
    return await tarea();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    // No upstream body, URL, query, credential or personal data in logs.
    logger.error("Fallo de operación", {
      operacion,
      tipo: error?.name ?? "Error",
    });
    throw new HttpsError("internal", "No se pudo completar la operación.");
  }
}
