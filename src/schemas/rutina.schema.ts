import { z } from "zod";

import {
  nivelExperienciaSchema,
  objetivoUsuarioSchema,
} from "@/schemas/usuario.schema";

// ── Ejercicio dentro de una rutina ───────────────────────────────────

export const ejercicioRutinaSchema = z.object({
  maquinaId: z.number().int().positive("ID de máquina inválido"),
  maquinaCatalogoId: z.string().min(1).optional(),
  nombre: z.string().min(1, "El nombre del ejercicio es obligatorio"),
  imagenUrl: z.string().url().nullable(),
  series: z.number().int().min(1, "Mínimo 1 serie").max(20, "Máximo 20 series"),
  repeticiones: z
    .number()
    .int()
    .min(1, "Mínimo 1 repetición")
    .max(100, "Máximo 100 repeticiones"),
  descansoSegundos: z
    .number()
    .int()
    .min(0, "El descanso no puede ser negativo")
    .max(600, "Máximo 10 minutos de descanso"),
});

export type EjercicioRutinaInput = z.infer<typeof ejercicioRutinaSchema>;

// ── Día de rutina ────────────────────────────────────────────────────

export const diaRutinaSchema = z.object({
  dia: z.number().int().min(1).max(7),
  enfoque: z.string().min(1, "El enfoque del día es obligatorio"),
  ejercicios: z
    .array(ejercicioRutinaSchema)
    .min(1, "Cada día debe tener al menos 1 ejercicio"),
});

export type DiaRutinaInput = z.infer<typeof diaRutinaSchema>;

// ── Crear rutina personalizada ───────────────────────────────────────

export const crearRutinaPersonalizadaSchema = z.object({
  nombre: z.string().min(1, "El nombre de la rutina es obligatorio").max(100),
  planSemanal: z
    .array(diaRutinaSchema)
    .min(1, "La rutina debe tener al menos 1 día")
    .max(7, "Máximo 7 días por semana"),
});

export type CrearRutinaPersonalizadaInput = z.infer<
  typeof crearRutinaPersonalizadaSchema
>;

// ── Generar rutina IA ────────────────────────────────────────────────

export const generarRutinaIASchema = z.object({
  objetivo: objetivoUsuarioSchema,
  nivel: nivelExperienciaSchema,
});

export type GenerarRutinaIAInput = z.infer<typeof generarRutinaIASchema>;

// ── Actualizar rutina ────────────────────────────────────────────────

export const actualizarRutinaSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  planSemanal: z.array(diaRutinaSchema).min(1).max(7).optional(),
});

export type ActualizarRutinaInput = z.infer<typeof actualizarRutinaSchema>;
