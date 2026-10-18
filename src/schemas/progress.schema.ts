import { z } from "zod";

// ── Registrar progreso físico ────────────────────────────────────────

export const registrarProgresoSchema = z.object({
  peso: z
    .number()
    .min(10, "Peso mínimo: 10 kg")
    .max(500, "Peso máximo: 500 kg"),
  altura: z.number().min(50, "Altura mínima: 50 cm").max(300).optional(),
  notas: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export type RegistrarProgresoInput = z.infer<typeof registrarProgresoSchema>;

// ── Actualizar progreso físico ───────────────────────────────────────

export const actualizarProgresoSchema = z.object({
  peso: z.number().min(10).max(500).optional(),
  altura: z.number().min(50).max(300).optional(),
  notas: z.string().max(500).optional(),
});

export type ActualizarProgresoInput = z.infer<typeof actualizarProgresoSchema>;
