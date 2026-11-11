import { useCallback, useState } from "react";

const MENSAJE_POR_DEFECTO =
  "No pudimos cargar tus datos. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Estado de error de las pantallas con listeners en tiempo real, para no
 * confundir "falló la carga" con "no hay datos".
 *
 * Uso: pasar `reportar` como `onError` de cada `observar(...)` y poner
 * `intento` en las dependencias del efecto de suscripción. `reintentar`
 * limpia el error y sube `intento`, lo que vuelve a suscribir.
 */
export function useErrorDeCarga() {
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const reportar = useCallback((origen: string, causa: Error) => {
    console.warn(`[${origen}] falló la suscripción:`, causa.message);
    setError(MENSAJE_POR_DEFECTO);
  }, []);

  const reintentar = useCallback(() => {
    setError(null);
    setIntento((n) => n + 1);
  }, []);

  return { error, intento, reportar, reintentar };
}
