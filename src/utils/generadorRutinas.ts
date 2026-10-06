import type {
  NivelExperiencia,
  ObjetivoUsuario,
} from "@/models/entities/Usuario";

/**
 * Heurística pura para armar la estructura de una rutina semanal.
 * Sin llamadas de red ni a Firestore: solo decide, dado un objetivo y un
 * nivel, cuántos días entrenar por semana, qué grupos musculares tocar cada
 * día y con qué parámetros de serie/repeticiones/descanso.
 *
 * El `RutinasController` combina esta estructura con ejercicios reales
 * (obtenidos vía `EjerciciosWgerController`) para armar la `Rutina` final.
 */

export interface ParametrosSerie {
  series: number;
  repeticiones: number;
  descansoSegundos: number;
}

export interface BloqueDia {
  enfoque: string;
  /** IDs de categoría de wger (ver `ejercicioWgerRepository.ts`) de donde sacar ejercicios. */
  categoriasIds: number[];
  cantidadEjercicios: number;
}

export interface PlanHeuristico {
  diasPorSemana: number;
  parametrosSerie: ParametrosSerie;
  bloques: BloqueDia[];
}

// IDs de categoría reales de wger (confirmados vía /api/v2/exercisecategory/).
const CATEGORIA = {
  ABDOMINALES: 10,
  BRAZOS: 8,
  ESPALDA: 12,
  PANTORRILLAS: 14,
  CARDIO: 15,
  PECHO: 11,
  PIERNAS: 9,
  HOMBROS: 13,
} as const;

const PARAMETROS_POR_OBJETIVO: Record<ObjetivoUsuario, ParametrosSerie> = {
  perder_peso: { series: 3, repeticiones: 15, descansoSegundos: 45 },
  ganar_masa: { series: 4, repeticiones: 9, descansoSegundos: 90 },
  mantenimiento: { series: 3, repeticiones: 12, descansoSegundos: 60 },
  resistencia: { series: 3, repeticiones: 18, descansoSegundos: 30 },
};

const DIAS_POR_NIVEL: Record<NivelExperiencia, number> = {
  principiante: 3,
  intermedio: 4,
  avanzado: 5,
};

const BLOQUE_EMPUJE: BloqueDia = {
  enfoque: "Pecho, Hombros y Brazos",
  categoriasIds: [CATEGORIA.PECHO, CATEGORIA.HOMBROS, CATEGORIA.BRAZOS],
  cantidadEjercicios: 5,
};
const BLOQUE_TIRON: BloqueDia = {
  enfoque: "Espalda y Abdominales",
  categoriasIds: [CATEGORIA.ESPALDA, CATEGORIA.ABDOMINALES],
  cantidadEjercicios: 5,
};
const BLOQUE_PIERNA: BloqueDia = {
  enfoque: "Piernas y Pantorrillas",
  categoriasIds: [CATEGORIA.PIERNAS, CATEGORIA.PANTORRILLAS],
  cantidadEjercicios: 5,
};
const BLOQUE_CARDIO: BloqueDia = {
  enfoque: "Cardio y Abdominales",
  categoriasIds: [CATEGORIA.CARDIO, CATEGORIA.ABDOMINALES],
  cantidadEjercicios: 4,
};
const BLOQUE_FULL: BloqueDia = {
  enfoque: "Cuerpo Completo",
  categoriasIds: [CATEGORIA.PECHO, CATEGORIA.ESPALDA, CATEGORIA.PIERNAS],
  cantidadEjercicios: 6,
};

function bloquesPorDias(
  diasPorSemana: number,
  objetivo: ObjetivoUsuario,
): BloqueDia[] {
  const enfasisCardio =
    objetivo === "perder_peso" || objetivo === "resistencia";

  switch (diasPorSemana) {
    case 3:
      return enfasisCardio
        ? [BLOQUE_EMPUJE, BLOQUE_CARDIO, BLOQUE_PIERNA]
        : [BLOQUE_EMPUJE, BLOQUE_TIRON, BLOQUE_PIERNA];
    case 4:
      return enfasisCardio
        ? [BLOQUE_EMPUJE, BLOQUE_TIRON, BLOQUE_CARDIO, BLOQUE_PIERNA]
        : [BLOQUE_EMPUJE, BLOQUE_TIRON, BLOQUE_PIERNA, BLOQUE_FULL];
    case 5:
    default:
      return enfasisCardio
        ? [
            BLOQUE_EMPUJE,
            BLOQUE_TIRON,
            BLOQUE_PIERNA,
            BLOQUE_CARDIO,
            BLOQUE_FULL,
          ]
        : [
            BLOQUE_EMPUJE,
            BLOQUE_TIRON,
            BLOQUE_PIERNA,
            BLOQUE_EMPUJE,
            BLOQUE_TIRON,
          ];
  }
}

/** Punto de entrada: dado un objetivo y nivel, arma la estructura semanal. */
export function generarPlanHeuristico(
  objetivo: ObjetivoUsuario,
  nivel: NivelExperiencia,
): PlanHeuristico {
  const diasPorSemana = DIAS_POR_NIVEL[nivel];
  return {
    diasPorSemana,
    parametrosSerie: PARAMETROS_POR_OBJETIVO[objetivo],
    bloques: bloquesPorDias(diasPorSemana, objetivo),
  };
}

/** Reparte una cantidad total de ejercicios entre N categorías lo más parejo posible. */
export function repartirCantidad(total: number, partes: number): number[] {
  const base = Math.floor(total / partes);
  const resto = total % partes;
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}
