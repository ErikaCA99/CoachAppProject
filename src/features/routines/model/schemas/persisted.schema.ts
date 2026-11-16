import { z } from "zod";

import { camposPropios } from "@/core/validation/persisted.schema";
import {
  nivelExperienciaSchema,
  objetivoUsuarioSchema,
} from "@/features/profile";
import { diaRutinaSchema } from "@/features/routines/model/schemas/routine.schema";

export const rutinaPersistidaSchema = z.object({
  ...camposPropios,
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
