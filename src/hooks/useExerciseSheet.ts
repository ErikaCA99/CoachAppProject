import { useEffect, useState } from "react";

import { EjerciciosWgerController } from "@/controllers/WgerExercisesController";
import type { EjercicioWger } from "@/models/entities/WgerExercise";
import type { ImagenEjercicioWger } from "@/models/entities/WgerExerciseImage";

export interface FichaEjercicio {
  cargando: boolean;
  /** Datos de wger (descripción, músculos, equipo...). `null` si no se pudo leer. */
  ejercicio: EjercicioWger | null;
  /** Imagen/GIF/pasos del catálogo propio (`ejerciciosWger`). */
  respaldo: ImagenEjercicioWger | null;
}

/**
 * Datos para la ficha de un ejercicio de rutina que no usa máquina: texto de
 * wger + imágenes y pasos del catálogo propio. Cada fuente falla por
 * separado: sin red, la ficha sigue mostrando lo que sí haya.
 */
export function useFichaEjercicio(wgerId: number): FichaEjercicio {
  const [ficha, setFicha] = useState<
    { id: number } & Omit<FichaEjercicio, "cargando">
  >();

  useEffect(() => {
    let activo = true;
    Promise.all([
      EjerciciosWgerController.obtenerPorId(wgerId).catch(() => null),
      EjerciciosWgerController.obtenerImagenRespaldo(wgerId).catch(() => null),
    ]).then(([ejercicio, respaldo]) => {
      if (activo) setFicha({ id: wgerId, ejercicio, respaldo });
    });
    return () => {
      activo = false;
    };
  }, [wgerId]);

  return ficha?.id === wgerId
    ? { cargando: false, ejercicio: ficha.ejercicio, respaldo: ficha.respaldo }
    : { cargando: true, ejercicio: null, respaldo: null };
}
