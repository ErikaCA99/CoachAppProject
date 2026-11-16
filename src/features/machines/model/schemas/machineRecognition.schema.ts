import { z } from "zod";

/** Coordenadas normalizadas respecto al JPEG completo enviado al detector. */
export const cajaDeteccionSchema = z
  .object({
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1),
  })
  .refine((caja) => caja.x1 < caja.x2 && caja.y1 < caja.y2);

export type CajaDeteccion = z.infer<typeof cajaDeteccionSchema>;

export const respuestaReconocimientoSchema = z.object({
  sugerencias: z
    .array(
      z.object({
        maquinaId: z.string().min(1).max(128),
        confianza: z.number().min(0).max(1),
        caja: cajaDeteccionSchema.optional(),
      }),
    )
    .max(3),
});
