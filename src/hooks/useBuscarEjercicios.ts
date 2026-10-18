import { useEffect, useState } from "react";

import { EjerciciosWgerController } from "@/controllers/EjerciciosWgerController";
import type { EjercicioWger } from "@/models/entities/EjercicioWger";

const RETRASO_MS = 400;

/**
 * Búsqueda de ejercicios del catálogo con debounce. Solo consulta mientras
 * `activo` sea `true` (p. ej. el modal está abierto); con búsqueda vacía
 * trae el listado por defecto.
 */
export function useBuscarEjercicios(activo: boolean) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<EjercicioWger[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!activo) return;
    const timeout = setTimeout(() => {
      setCargando(true);
      EjerciciosWgerController.listar({
        busqueda: busqueda.trim() || undefined,
      })
        .then((resultado) => setResultados(resultado.items))
        .catch((error) => console.error("Error al buscar ejercicios:", error))
        .finally(() => setCargando(false));
    }, RETRASO_MS);
    return () => clearTimeout(timeout);
  }, [activo, busqueda]);

  return { busqueda, setBusqueda, resultados, cargando };
}
