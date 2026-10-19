import { z } from "zod";

/**
 * Valida cada documento de `maquinas/` al leerlo. Si el seed cambia de forma
 * o hay un documento corrupto, se descarta ese documento (con aviso en
 * consola) en lugar de romper la pantalla completa.
 */

const ruta = z.string().min(1);

export const maquinaSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  tipo: z.enum(["maquina", "polea", "banco-rack", "cardio"]),
  orden: z.number().int(),
  descripcion: z.string(),
  musculosPrincipales: z.array(z.string()),
  musculosSecundarios: z.array(z.string()),
  instrucciones: z.array(z.string()),
  erroresComunes: z.array(z.string()),
  prevencionLesiones: z.array(z.string()),
  imagenPrincipal: ruta,
  gifPrincipal: ruta.nullable().default(null),
  variantes: z
    .array(
      z.object({
        nombre: z.string(),
        handle: z.string(),
        imagen: ruta.nullable(),
      }),
    )
    .default([]),
  ejercicios: z
    .array(
      z.object({
        nombre: z.string(),
        wgerId: z.number().int().nullable(),
        freeExerciseDbId: z.string().nullable(),
        imagenes: z.array(ruta),
      }),
    )
    .default([]),
  ejerciciosGif: z
    .array(
      z.object({
        workoutxId: z.string(),
        nombre: z.string(),
        nombreOriginal: z.string(),
        dificultad: z.enum(["Principiante", "Intermedio", "Avanzado"]),
        musculoObjetivo: z.string(),
        gifPath: ruta,
      }),
    )
    .default([]),
  wgerIds: z.array(z.number().int()).default([]),
  workoutxIds: z.array(z.string()).default([]),
});

export type MaquinaInput = z.infer<typeof maquinaSchema>;
