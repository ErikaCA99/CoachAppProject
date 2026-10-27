import { z } from "zod";

/**
 * Valida cada documento de `ejerciciosWger/` al leerlo. Un documento
 * corrupto se descarta (con aviso) en lugar de romper la pantalla.
 */

const ruta = z.string().min(1);

export const imagenEjercicioWgerSchema = z
  .object({
    id: z.string().min(1),
    wgerId: z.number().int(),
    nombreWger: z.string(),
    imagenes: z.array(ruta).default([]),
    pasos: z.array(z.string().min(1)).default([]),
    gif: ruta.nullable().default(null),
    miniatura: ruta.nullable().default(null),
    fuentes: z
      .object({
        gymVisual: z.object({ atribucion: z.string() }).optional(),
      })
      .passthrough()
      .default({}),
  })
  .transform(({ fuentes, id: _id, ...resto }) => ({
    ...resto,
    atribucionGymVisual: fuentes.gymVisual?.atribucion ?? null,
  }));
