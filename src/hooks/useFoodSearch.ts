import { useEffect, useState } from "react";

import { NutritionController } from "@/controllers/NutritionController";
import type { AlimentoUSDA } from "@/models/entities/USDAFood";

const LONGITUD_MINIMA = 2;

interface EstadoBusqueda {
  consulta: string;
  resultados: AlimentoUSDA[];
  error: string | null;
}

/**
 * Búsqueda de alimentos en USDA con debounce y cancelación.
 *
 * - Espera `retrasoMs` desde la última tecla antes de consultar la API
 *   (evita una solicitud por letra y respeta el límite de 1.000/hora).
 * - Si el usuario sigue escribiendo, aborta la solicitud anterior para que
 *   una respuesta vieja nunca pise a una nueva.
 * - `cargando` se deriva (no es estado propio): está cargando mientras el
 *   último resultado guardado no corresponda a la consulta actual.
 */
export function useBuscarAlimentos(texto: string, retrasoMs = 450) {
  const consulta = texto.trim();
  const esValida = consulta.length >= LONGITUD_MINIMA;

  const [estado, setEstado] = useState<EstadoBusqueda>({
    consulta: "",
    resultados: [],
    error: null,
  });

  useEffect(() => {
    if (!esValida) return;

    const controlador = new AbortController();
    const temporizador = setTimeout(() => {
      NutritionController.buscarAlimentos(consulta, controlador.signal)
        .then((resultados) => {
          if (!controlador.signal.aborted)
            setEstado({ consulta, resultados, error: null });
        })
        .catch((error: unknown) => {
          if (controlador.signal.aborted) return;
          setEstado({
            consulta,
            resultados: [],
            error:
              error instanceof Error
                ? error.message
                : "No se pudo buscar el alimento.",
          });
        });
    }, retrasoMs);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [consulta, esValida, retrasoMs]);

  if (!esValida) {
    return { resultados: [], cargando: false, error: null, esValida };
  }

  const listo = estado.consulta === consulta;
  return {
    resultados: listo ? estado.resultados : [],
    cargando: !listo,
    error: listo ? estado.error : null,
    esValida,
  };
}
