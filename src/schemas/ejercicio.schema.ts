import { z } from "zod";

// ── Ejercicio del catálogo público ───────────────────────────────────

export const ejercicioSchema = z.object({
  nombre: z.string().min(1, "El nombre del ejercicio es obligatorio").max(200),
  maquinaId: z.number().int().positive().optional(),
  grupoMuscular: z.array(z.string().min(1)).min(1, "Debe tener al menos 1 grupo muscular"),
  descripcion: z.string().min(1, "La descripción es obligatoria").max(2000),
  seriesRecomendadas: z.number().int().min(1).max(20).optional(),
  repeticionesRecomendadas: z.number().int().min(1).max(100).optional(),
  videoUrl: z.string().url().nullable().optional(),
  imagenUrl: z.string().url().nullable().optional(),
});

export type EjercicioInput = z.infer<typeof ejercicioSchema>;

// ── Actualizar ejercicio ─────────────────────────────────────────────

export const actualizarEjercicioSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  maquinaId: z.number().int().positive().optional(),
  grupoMuscular: z.array(z.string().min(1)).min(1).optional(),
  descripcion: z.string().min(1).max(2000).optional(),
  seriesRecomendadas: z.number().int().min(1).max(20).optional(),
  repeticionesRecomendadas: z.number().int().min(1).max(100).optional(),
  videoUrl: z.string().url().nullable().optional(),
  imagenUrl: z.string().url().nullable().optional(),
});

export type ActualizarEjercicioInput = z.infer<typeof actualizarEjercicioSchema>;
