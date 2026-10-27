import { z } from "zod";
import { diaRutinaSchema } from "@/schemas/routine.schema";
import {
  registroIMCSchema,
  registroIngestaSchema,
} from "@/schemas/nutrition.schema";
import { registrarProgresoSchema } from "@/schemas/progress.schema";
import { marcarEntrenamientoSchema } from "@/schemas/workout.schema";
import {
  crearUsuarioSchema,
  nivelExperienciaSchema,
  objetivoUsuarioSchema,
} from "@/schemas/user.schema";

const fechas = {
  id: z.string().min(1),
  creadoEn: z
    .date()
    .nullish()
    .transform((v) => v ?? undefined),
  actualizadoEn: z.date().nullish(),
};
const propio = { ...fechas, usuarioId: z.string().min(1) };
export const perfilPersistidoSchema = crearUsuarioSchema.extend({
  ...fechas,
  rutinaActivaId: z.string().max(128).nullable().optional(),
});
export const progresoPersistidoSchema = registrarProgresoSchema.extend({
  ...propio,
  imc: z.number().positive().max(2000).optional(),
});
export const nutricionPersistidaSchema = z.union([
  registroIMCSchema.extend(propio),
  registroIngestaSchema.extend(propio),
]);
export const entrenamientoPersistidoSchema =
  marcarEntrenamientoSchema.extend(propio);
export const rutinaPersistidaSchema = z.object({
  ...propio,
  nombre: z.string().min(1).max(100),
  tipo: z.enum(["ia", "personalizada"]),
  objetivo: objetivoUsuarioSchema.optional(),
  nivel: nivelExperienciaSchema.optional(),
  diasPorSemana: z.number().int().min(1).max(7),
  planSemanal: z.array(diaRutinaSchema).min(1).max(7),
  origenPlan: z.enum(["modelo", "heuristica"]).optional(),
  versionModelo: z.string().max(100).optional(),
  confianzaModelo: z.number().min(0).max(1).optional(),
});
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
