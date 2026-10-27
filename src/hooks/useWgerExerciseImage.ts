import { useEffect, useState } from "react";

import { EjerciciosWgerController } from "@/controllers/WgerExercisesController";
import type { ImagenEjercicioWger } from "@/models/entities/WgerExerciseImage";

/**
 * Imagen de respaldo (`ejerciciosWger/{id}`) de un ejercicio de wger.
 * Solo consulta cuando `habilitado` es true (es decir, cuando wger no trajo
 * foto). Devuelve `null` mientras carga o si no hay imagen de respaldo.
 */
export function useImagenRespaldoWger(
  wgerId: number,
  habilitado: boolean,
): ImagenEjercicioWger | null {
  const [resultado, setResultado] = useState<{
    wgerId: number;
    imagen: ImagenEjercicioWger | null;
  } | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    let activo = true;
    EjerciciosWgerController.obtenerImagenRespaldo(wgerId).then((imagen) => {
      if (activo) setResultado({ wgerId, imagen });
    });
    return () => {
      activo = false;
    };
  }, [wgerId, habilitado]);

  return habilitado && resultado?.wgerId === wgerId ? resultado.imagen : null;
}
