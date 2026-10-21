/**
 * Progreso "simulado" para pantallas de carga cuyo trabajo real no reporta
 * avance (por ejemplo, generar una rutina: es una sola promesa). Sube rápido
 * al principio y se frena cerca del tope; solo llega a 100 cuando el trabajo
 * termina de verdad. Funciones puras para poder probarlas con Jest.
 */

/** Tope mientras se espera: nunca muestra 100 % antes de terminar. */
export const PORCENTAJE_MAXIMO_ESPERA = 92;

/** Mayor = el avance se frena más tarde. */
const CONSTANTE_TIEMPO_MS = 2500;

/** Porcentaje (0–92, entero y no decreciente) según los ms desde que empezó. */
export function porcentajeSimulado(msTranscurridos: number): number {
  if (msTranscurridos <= 0) return 0;
  const avance =
    PORCENTAJE_MAXIMO_ESPERA *
    (1 - Math.exp(-msTranscurridos / CONSTANTE_TIEMPO_MS));
  return Math.min(PORCENTAJE_MAXIMO_ESPERA, Math.floor(avance));
}

/** Un paso hacia 100 una vez que el trabajo ya terminó. */
export function avanzarHaciaCien(actual: number, paso = 7): number {
  return Math.min(100, actual + paso);
}
