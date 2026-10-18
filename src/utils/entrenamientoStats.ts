/**
 * Utilidades puras para el seguimiento de entrenamientos (racha, semana
 * actual, resumen). Sin efectos secundarios ni dependencias externas —
 * reciben fechas y devuelven números/estructuras simples, igual que
 * `imcCalculator.ts`.
 */

export interface DiaSemanaSeguimiento {
  /** Fecha en formato `YYYY-MM-DD`. */
  fecha: string;
  /** Inicial del día en español (L, M, X, J, V, S, D). */
  etiqueta: string;
  /** Día del mes (para el número dentro del círculo). */
  numeroDia: number;
  completado: boolean;
  esHoy: boolean;
  esFuturo: boolean;
}

export interface ResumenEntrenamientos {
  rachaActual: number;
  completadosSemana: number;
  totalSemana: 7;
  totalEntrenos: number;
  dias: DiaSemanaSeguimiento[];
}

const ETIQUETAS_DIA = ["L", "M", "X", "J", "V", "S", "D"];

/** Formatea una fecha como `YYYY-MM-DD` usando componentes locales (no UTC). */
export function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function inicioDelDia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/** Devuelve el lunes de la semana (lunes a domingo) que contiene `fecha`. */
function lunesDeLaSemana(fecha: Date): Date {
  const dia = inicioDelDia(fecha);
  const diaSemana = dia.getDay(); // 0 = domingo .. 6 = sábado
  const offsetHastaLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  dia.setDate(dia.getDate() + offsetHastaLunes);
  return dia;
}

/** Racha de días consecutivos con al menos un entrenamiento completado. */
export function calcularRacha(
  fechasCompletadas: ReadonlySet<string>,
  ahora: Date,
): number {
  const cursor = inicioDelDia(ahora);
  // Si hoy todavía no se completó, la racha se evalúa desde ayer: así no se
  // "rompe" a medianoche mientras el usuario aún puede entrenar hoy.
  if (!fechasCompletadas.has(formatearFechaISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let racha = 0;
  while (fechasCompletadas.has(formatearFechaISO(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

/**
 * Arma el resumen completo para la pestaña "Rutinas" de Progreso: racha,
 * días completados de la semana actual (lunes a domingo) y total histórico.
 */
export function calcularResumenEntrenamientos(
  fechasEntrenamientos: readonly string[],
  ahora: Date = new Date(),
): ResumenEntrenamientos {
  const fechasCompletadas = new Set(fechasEntrenamientos);
  const hoyISO = formatearFechaISO(ahora);
  const lunes = lunesDeLaSemana(ahora);

  const dias: DiaSemanaSeguimiento[] = Array.from({ length: 7 }, (_, i) => {
    const fechaDia = new Date(lunes);
    fechaDia.setDate(lunes.getDate() + i);
    const fechaISO = formatearFechaISO(fechaDia);
    return {
      fecha: fechaISO,
      etiqueta: ETIQUETAS_DIA[i],
      numeroDia: fechaDia.getDate(),
      completado: fechasCompletadas.has(fechaISO),
      esHoy: fechaISO === hoyISO,
      esFuturo: fechaISO > hoyISO,
    };
  });

  return {
    rachaActual: calcularRacha(fechasCompletadas, ahora),
    completadosSemana: dias.filter((d) => d.completado).length,
    totalSemana: 7,
    totalEntrenos: fechasEntrenamientos.length,
    dias,
  };
}
