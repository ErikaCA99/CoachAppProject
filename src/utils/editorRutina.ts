import type { EjercicioWger } from "@/models/entities/EjercicioWger";
import type { DiaRutina, EjercicioRutina } from "@/models/entities/Rutina";

/**
 * Reglas del editor de rutinas personalizadas. Todas son funciones puras e
 * inmutables sobre la lista de días (sin React ni Firebase), por lo que se
 * pueden probar sin montar ninguna pantalla.
 */

export const MAX_DIAS_RUTINA = 7;

/** Valores por defecto de un ejercicio recién agregado a mano. */
export const SERIES_POR_DEFECTO = 3;
export const REPETICIONES_POR_DEFECTO = 12;
export const DESCANSO_POR_DEFECTO_SEG = 60;

export function crearDiaVacio(numero: number): DiaRutina {
  return { dia: numero, enfoque: "", ejercicios: [] };
}

/** Agrega un día vacío al final (hasta `MAX_DIAS_RUTINA`). */
export function agregarDia(dias: DiaRutina[]): DiaRutina[] {
  if (dias.length >= MAX_DIAS_RUTINA) return dias;
  return [...dias, crearDiaVacio(dias.length + 1)];
}

/** Quita un día y renumera los restantes (1..n). Siempre queda al menos uno. */
export function quitarDia(dias: DiaRutina[], indice: number): DiaRutina[] {
  if (dias.length <= 1) return dias;
  return dias
    .filter((_, i) => i !== indice)
    .map((dia, i) => ({ ...dia, dia: i + 1 }));
}

/**
 * Nuevo índice del día activo tras quitar el día `indiceQuitado`.
 *
 * El día activo debe seguir apuntando al mismo contenido, no a la misma
 * posición: si se borra un día ANTES del activo, todo se recorre un lugar a
 * la izquierda y hay que decrementar; si se borra el propio día activo, el
 * foco pasa al que quedó en su lugar (o al último si era el último); si se
 * borra uno DESPUÉS, el activo no se mueve.
 */
export function diaActivoTrasQuitar(
  diaActivo: number,
  indiceQuitado: number,
  cantidadRestante: number,
): number {
  if (indiceQuitado < diaActivo) return diaActivo - 1;
  if (indiceQuitado === diaActivo) {
    return Math.min(diaActivo, cantidadRestante - 1);
  }
  return diaActivo;
}

export function actualizarEnfoque(
  dias: DiaRutina[],
  indiceDia: number,
  enfoque: string,
): DiaRutina[] {
  return dias.map((dia, i) => (i === indiceDia ? { ...dia, enfoque } : dia));
}

/** Convierte un ejercicio del catálogo en uno de rutina con valores por defecto. */
export function ejercicioDesdeWger(ejercicio: EjercicioWger): EjercicioRutina {
  return {
    maquinaId: ejercicio.id,
    nombre: ejercicio.nombre,
    imagenUrl: ejercicio.imagenUrl,
    series: SERIES_POR_DEFECTO,
    repeticiones: REPETICIONES_POR_DEFECTO,
    descansoSegundos: DESCANSO_POR_DEFECTO_SEG,
  };
}

export function agregarEjercicio(
  dias: DiaRutina[],
  indiceDia: number,
  ejercicio: EjercicioRutina,
): DiaRutina[] {
  return dias.map((dia, i) =>
    i === indiceDia
      ? { ...dia, ejercicios: [...dia.ejercicios, ejercicio] }
      : dia,
  );
}

export function quitarEjercicio(
  dias: DiaRutina[],
  indiceDia: number,
  indiceEjercicio: number,
): DiaRutina[] {
  return dias.map((dia, i) =>
    i === indiceDia
      ? {
          ...dia,
          ejercicios: dia.ejercicios.filter((_, j) => j !== indiceEjercicio),
        }
      : dia,
  );
}

export function contarEjercicios(dias: DiaRutina[]): number {
  return dias.reduce((acc, dia) => acc + dia.ejercicios.length, 0);
}
