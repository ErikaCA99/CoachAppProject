import { z } from "zod";

import { OPCIONES_DIAS_DISPONIBLES, RANGO_EDAD } from "@/models/entities/User";

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

export const generoUsuarioSchema = z.enum(["masculino", "femenino"], {
  error: "Elige una opción",
});

export const edadSchema = z
  .number({ error: "Ingresa tu edad" })
  .int("La edad debe ser un número entero")
  .min(RANGO_EDAD.min, `Edad mínima: ${RANGO_EDAD.min} años`)
  .max(RANGO_EDAD.max, `Edad máxima: ${RANGO_EDAD.max} años`);

export const diasDisponiblesSchema = z
  .number({ error: "Elige cuántos días puedes entrenar" })
  .int()
  .min(OPCIONES_DIAS_DISPONIBLES[0])
  .max(OPCIONES_DIAS_DISPONIBLES[OPCIONES_DIAS_DISPONIBLES.length - 1]);

const alturaSchema = z
  .number({ error: "Ingresa tu altura" })
  .min(50, "Altura mínima: 50 cm")
  .max(300, "Altura máxima: 300 cm");

const pesoSchema = z
  .number({ error: "Ingresa tu peso" })
  .min(10, "Peso mínimo: 10 kg")
  .max(500, "Peso máximo: 500 kg");

// ── Creación de perfil (registro) ────────────────────────────────────

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  apellidos: z.string().max(100).optional(),
  email: z.string().email("Correo electrónico inválido"),
  genero: generoUsuarioSchema.optional(),
  altura: alturaSchema.optional(),
  pesoActual: pesoSchema.optional(),
  edad: edadSchema.optional(),
  diasDisponibles: diasDisponiblesSchema.optional(),
  nivel: nivelExperienciaSchema.optional(),
  objetivo: objetivoUsuarioSchema.optional(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;

// ── Actualización de perfil ──────────────────────────────────────────

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellidos: z.string().max(100).optional(),
  genero: generoUsuarioSchema.optional(),
  altura: alturaSchema.optional(),
  pesoActual: pesoSchema.optional(),
  edad: edadSchema.optional(),
  diasDisponibles: diasDisponiblesSchema.optional(),
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

// ── Datos físicos (onboarding · paso 2) ──────────────────────────────

export const datosFisicosSchema = z.object({
  genero: generoUsuarioSchema,
  edad: edadSchema,
  altura: alturaSchema,
  pesoActual: pesoSchema,
  diasDisponibles: diasDisponiblesSchema,
});

export type DatosFisicosInput = z.infer<typeof datosFisicosSchema>;

// ── Onboarding completo (lo que se guarda al terminar) ───────────────

export const datosOnboardingSchema = objetivoYNivelSchema.extend(
  datosFisicosSchema.shape,
);

export type DatosOnboardingInput = z.infer<typeof datosOnboardingSchema>;
