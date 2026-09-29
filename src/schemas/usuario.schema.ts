import { z } from "zod";

// ── Tipos base reutilizables ─────────────────────────────────────────

export const objetivoUsuarioSchema = z.enum([
  "perder_peso",
  "ganar_masa",
  "mantenimiento",
  "resistencia",
]);

export const nivelExperienciaSchema = z.enum([
  "principiante",
  "intermedio",
  "avanzado",
]);

export const generoUsuarioSchema = z.enum(["masculino", "femenino", "otro"]);

// ── Creación de perfil (registro) ────────────────────────────────────

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  apellidos: z.string().max(100).optional(),
  email: z.string().email("Correo electrónico inválido"),
  genero: generoUsuarioSchema.optional(),
  altura: z.number().min(50, "Altura mínima: 50 cm").max(300).optional(),
  pesoActual: z.number().min(10, "Peso mínimo: 10 kg").max(500).optional(),
  nivel: nivelExperienciaSchema.optional(),
  objetivo: objetivoUsuarioSchema.optional(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;

// ── Actualización de perfil ──────────────────────────────────────────

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellidos: z.string().max(100).optional(),
  genero: generoUsuarioSchema.optional(),
  altura: z.number().min(50).max(300).optional(),
  pesoActual: z.number().min(10).max(500).optional(),
  nivel: nivelExperienciaSchema.optional(),
  objetivo: objetivoUsuarioSchema.optional(),
  rutinaActivaId: z.string().nullable().optional(),
});

export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;

// ── Objetivo + Nivel (onboarding) ────────────────────────────────────

export const objetivoYNivelSchema = z.object({
  objetivo: objetivoUsuarioSchema,
  nivel: nivelExperienciaSchema,
});

export type ObjetivoYNivelInput = z.infer<typeof objetivoYNivelSchema>;
