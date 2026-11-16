import { z } from "zod";

// ── Marcar un día de la rutina como completado ───────────────────────

export const marcarEntrenamientoSchema = z.object({
  rutinaId: z.string().min(1, "Falta el ID de la rutina"),
  dia: z.number().int().min(1, "Día inválido").max(7, "Día inválido"),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (usa YYYY-MM-DD)"),
});

export type MarcarEntrenamientoInput = z.infer<
  typeof marcarEntrenamientoSchema
>;
