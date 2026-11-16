/**
 * Lógica pura de una sesión de entrenamiento guiada ("Entrenar hoy"): avanza
 * serie por serie y ejercicio por ejercicio, con descanso entre series. Sin
 * efectos secundarios ni dependencias de React/Firebase: recibe `ahora` (ms)
 * como parámetro para que sea determinista y fácil de probar, igual que
 * `workoutStats.ts`.
 */

export interface EjercicioSesion {
  series: number;
  descansoSegundos: number;
}

export interface SesionEntrenamiento {
  ejercicios: readonly EjercicioSesion[];
  /** Índice (0-based) del ejercicio actual. */
  indice: number;
  /** Serie actual (1-based) dentro del ejercicio actual. */
  serie: number;
  /** Instante (ms epoch) en que termina el descanso en curso, o `null`. */
  descansoTerminaEn: number | null;
  /** Índices de ejercicios que el usuario saltó sin hacer. */
  omitidos: readonly number[];
  terminado: boolean;
}

/** Un ejercicio sin series válidas se trata como 1 serie para no bloquear el avance. */
function totalSeries(ejercicio: EjercicioSesion): number {
  return Math.max(1, Math.floor(ejercicio.series));
}

export function crearSesion(
  ejercicios: readonly EjercicioSesion[],
): SesionEntrenamiento {
  return {
    ejercicios,
    indice: 0,
    serie: 1,
    descansoTerminaEn: null,
    omitidos: [],
    terminado: ejercicios.length === 0,
  };
}

/** Pasa al siguiente ejercicio (serie 1) o termina la sesión si no quedan más. */
function pasarAlSiguiente(sesion: SesionEntrenamiento): SesionEntrenamiento {
  const siguiente = sesion.indice + 1;
  return {
    ...sesion,
    indice: siguiente,
    serie: 1,
    terminado: siguiente >= sesion.ejercicios.length,
  };
}

/**
 * Marca la serie actual como hecha. Avanza a la siguiente serie o ejercicio
 * y, salvo que ya no quede nada por hacer, inicia el descanso configurado
 * del ejercicio que se acaba de trabajar.
 */
export function completarSerie(
  sesion: SesionEntrenamiento,
  ahora: number,
): SesionEntrenamiento {
  if (sesion.terminado || segundosDescanso(sesion, ahora) > 0) return sesion;

  const actual = sesion.ejercicios[sesion.indice];
  const avanzada =
    sesion.serie < totalSeries(actual)
      ? { ...sesion, serie: sesion.serie + 1 }
      : pasarAlSiguiente(sesion);

  const segundos = Math.max(0, actual.descansoSegundos);
  return {
    ...avanzada,
    descansoTerminaEn:
      avanzada.terminado || segundos === 0 ? null : ahora + segundos * 1000,
  };
}

/** Corta el descanso en curso (el usuario lo salta o ya terminó). */
export function terminarDescanso(
  sesion: SesionEntrenamiento,
): SesionEntrenamiento {
  return sesion.descansoTerminaEn === null
    ? sesion
    : { ...sesion, descansoTerminaEn: null };
}

/** Salta el ejercicio actual sin registrarlo y cancela cualquier descanso. */
export function saltarEjercicio(
  sesion: SesionEntrenamiento,
): SesionEntrenamiento {
  if (sesion.terminado) return sesion;
  return {
    ...pasarAlSiguiente(sesion),
    descansoTerminaEn: null,
    omitidos: [...sesion.omitidos, sesion.indice],
  };
}

/** Segundos que faltan de descanso (0 si no hay descanso en curso). */
export function segundosDescanso(
  sesion: SesionEntrenamiento,
  ahora: number,
): number {
  if (sesion.descansoTerminaEn === null) return 0;
  return Math.max(0, Math.ceil((sesion.descansoTerminaEn - ahora) / 1000));
}

/** Avance (0..1) del ejercicio `indice`: los saltados no cuentan como hechos. */
export function progresoEjercicio(
  sesion: SesionEntrenamiento,
  indice: number,
): number {
  if (sesion.omitidos.includes(indice)) return 0;
  if (sesion.terminado || indice < sesion.indice) return 1;
  if (indice > sesion.indice) return 0;
  return (sesion.serie - 1) / totalSeries(sesion.ejercicios[indice]);
}

/** Cantidad de ejercicios completados (no saltados) al terminar la sesión. */
export function ejerciciosRealizados(sesion: SesionEntrenamiento): number {
  return sesion.ejercicios.length - sesion.omitidos.length;
}

/** Total de series hechas en los ejercicios que no se saltaron. */
export function seriesRealizadas(sesion: SesionEntrenamiento): number {
  return sesion.ejercicios.reduce(
    (acc, ejercicio, i) =>
      sesion.omitidos.includes(i) ? acc : acc + totalSeries(ejercicio),
    0,
  );
}

/** Formatea segundos como `mm:ss` (ej. 42 → "00:42"). */
export function formatearTemporizador(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
