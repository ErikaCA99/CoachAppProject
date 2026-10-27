import { z } from "zod";
export const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[^/]+$/);
const objetivo = z.enum([
  "perder_peso",
  "ganar_masa",
  "mantenimiento",
  "resistencia",
]);
const nivel = z.enum(["principiante", "intermedio", "avanzado"]);
const ejercicio = z.strictObject({
  maquinaId: z.number().int().positive(),
  maquinaCatalogoId: idSchema.optional(),
  nombre: z.string().trim().min(1).max(200),
  imagenUrl: z
    .url()
    .max(2048)
    .refine((v) => v.startsWith("https://"))
    .nullable(),
  series: z.number().int().min(1).max(20),
  repeticiones: z.number().int().min(1).max(100),
  descansoSegundos: z.number().int().min(0).max(600),
});
export const planSchema = z
  .array(
    z.strictObject({
      dia: z.number().int().min(1).max(7),
      enfoque: z.string().trim().min(1).max(200),
      ejercicios: z.array(ejercicio).min(1).max(20),
    }),
  )
  .min(1)
  .max(7)
  .refine(
    (dias) => new Set(dias.map((d) => d.dia)).size === dias.length,
    "Días repetidos",
  );
export const rutinaSchema = z
  .strictObject({
    nombre: z.string().trim().min(1).max(100),
    tipo: z.enum(["ia", "personalizada"]),
    objetivo: objetivo.optional(),
    nivel: nivel.optional(),
    planSemanal: planSchema,
    diasPorSemana: z.number().int().min(1).max(7),
    origenPlan: z.enum(["modelo", "heuristica"]).optional(),
    versionModelo: z.string().max(100).optional(),
    confianzaModelo: z.number().min(0).max(1).optional(),
  })
  .refine(
    (r) => r.diasPorSemana === r.planSemanal.length,
    "Cantidad de días inconsistente",
  );
export const escrituraRutinaSchema = z.discriminatedUnion("operacion", [
  z.strictObject({ operacion: z.literal("crear"), datos: rutinaSchema }),
  z.strictObject({
    operacion: z.literal("actualizar"),
    id: idSchema,
    datos: z
      .strictObject({
        nombre: z.string().trim().min(1).max(100).optional(),
        planSemanal: planSchema.optional(),
      })
      .refine((v) => Object.keys(v).length > 0),
  }),
]);
export const busquedaSchema = z.strictObject({
  consulta: z.string().trim().min(2).max(100),
  tamanoPagina: z.number().int().min(1).max(25).default(15),
});
export const alimentoSchema = z.object({
  fdcId: z.number().int().positive(),
  description: z.string().max(1000),
  dataType: z.string().max(100),
  foodCategory: z.string().max(300).optional(),
  foodNutrients: z
    .array(
      z.object({
        nutrientId: z.number().int(),
        nutrientName: z.string().max(200),
        nutrientNumber: z.string().max(20).optional(),
        unitName: z.string().max(30),
        value: z.number().finite(),
      }),
    )
    .max(200),
});
export const respuestaUsdaSchema = z.object({
  foods: z.array(alimentoSchema).max(25),
});
