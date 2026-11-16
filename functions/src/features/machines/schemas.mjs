import { z } from "zod";

import { idSchema } from "../../shared/schemas.mjs";

// Foto JPEG reducida (la app envía ~640 px, calidad 0,7) en base64.
export const reconocimientoSchema = z.strictObject({
  imagenBase64: z
    .string()
    .min(100)
    .max(450000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
    .refine((v) => v.startsWith("/9j/"), "Solo JPEG"),
});
export const cajaDeteccionSchema = z
  .strictObject({
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1),
  })
  .refine((caja) => caja.x1 < caja.x2 && caja.y1 < caja.y2);

export const respuestaReconocimientoSchema = z.strictObject({
  sugerencias: z
    .array(
      z.strictObject({
        maquinaId: idSchema,
        confianza: z.number().min(0).max(1),
        caja: cajaDeteccionSchema.optional(),
      }),
    )
    .max(3),
});
