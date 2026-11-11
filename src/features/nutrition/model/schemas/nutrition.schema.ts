import { z } from "zod";

// ── Registro de cálculo IMC ──────────────────────────────────────────

const categoriaIMCSchema = z.enum([
  "BAJO",
  "NORMALIDAD",
  "SOBREPESO",
  "OBESIDAD",
]);

export const registroIMCSchema = z.object({
  weight: z.number().min(10, "Peso mínimo: 10 kg").max(500),
  height: z.number().min(50, "Altura mínima: 50 cm").max(300),
  bmi: z.number().min(1).max(100),
  category: categoriaIMCSchema,
});

export type RegistroIMCInput = z.infer<typeof registroIMCSchema>;

// ── Registro de ingesta alimentaria ──────────────────────────────────

export const registroIngestaSchema = z.object({
  alimento: z.string().min(1, "El nombre del alimento es obligatorio").max(200),
  calorias: z
    .number()
    .min(0, "Las calorías no pueden ser negativas")
    .max(10_000, "Valor de calorías demasiado alto"),
  cantidad: z.string().max(100).optional(),
  proteinas: z
    .number()
    .min(0, "Las proteínas no pueden ser negativas")
    .max(1_000)
    .optional()
    .default(0),
  carbohidratos: z
    .number()
    .min(0, "Los carbohidratos no pueden ser negativos")
    .max(1_000)
    .optional()
    .default(0),
  grasas: z
    .number()
    .min(0, "Las grasas no pueden ser negativas")
    .max(1_000)
    .optional()
    .default(0),
  fdcId: z.number().int().positive().optional(),
});

export type RegistroIngestaInput = z.infer<typeof registroIngestaSchema>;
