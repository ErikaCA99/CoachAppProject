import { z } from "zod";

/**
 * Piezas comunes para validar documentos leídos de Firestore. Cada
 * funcionalidad compone su propio esquema persistido en
 * `features/<x>/model/schemas/persisted.schema.ts`.
 */
export const camposPersistidos = {
  id: z.string().min(1),
  creadoEn: z
    .date()
    .nullish()
    .transform((v) => v ?? undefined),
  actualizadoEn: z.date().nullish(),
};

/** Campos de un documento que pertenece a un usuario (`usuarios/{uid}/…`). */
export const camposPropios = {
  ...camposPersistidos,
  usuarioId: z.string().min(1),
};

/** Invalid legacy documents are surfaced as errors, never passed to the UI. */
export function validarDocumento<T>(
  schema: z.ZodType<T>,
): (datos: unknown) => T {
  return (datos) => {
    const resultado = schema.safeParse(datos);
    if (!resultado.success)
      throw new Error(
        "Hay un registro guardado con formato inválido. Contacta con soporte para revisarlo.",
      );
    return resultado.data;
  };
}
