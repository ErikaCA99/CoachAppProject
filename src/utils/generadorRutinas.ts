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
 *
 * Además define el ESPACIO DE SALIDA del modelo de IA (TensorFlow Lite):
 * `PLANTILLAS_SEMANALES` y `ESQUEMAS_CARGA` son las clases que predice la red.
 * El índice de cada elemento es la clase; no reordenar ni insertar en medio
 * sin reentrenar el modelo (agregar al final y subir la versión).
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

export interface PlantillaSemanal {
  id: string;
  diasPorSemana: number;
  enfasisCardio: boolean;
  bloques: BloqueDia[];
}

export interface EsquemaCarga {
  id: string;
  descripcion: string;
  parametros: ParametrosSerie;
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

// ── Esquemas de carga (salida "esquema" del modelo) ──────────────────

export const ESQUEMAS_CARGA: readonly EsquemaCarga[] = [
  {
    id: "metabolico",
    descripcion: "Alto volumen y descanso corto para gasto calórico",
    parametros: { series: 3, repeticiones: 15, descansoSegundos: 45 },
  },
  {
    id: "hipertrofia",
    descripcion: "Volumen moderado-alto en rango de hipertrofia",
    parametros: { series: 4, repeticiones: 9, descansoSegundos: 90 },
  },
  {
    id: "general",
    descripcion: "Acondicionamiento general / mantenimiento",
    parametros: { series: 3, repeticiones: 12, descansoSegundos: 60 },
  },
  {
    id: "resistencia",
    descripcion: "Repeticiones altas y descanso mínimo",
    parametros: { series: 3, repeticiones: 18, descansoSegundos: 30 },
  },
];

/** Índice en `ESQUEMAS_CARGA` que la heurística asigna a cada objetivo. */
const ESQUEMA_POR_OBJETIVO: Record<ObjetivoUsuario, number> = {
  perder_peso: 0,
  ganar_masa: 1,
  mantenimiento: 2,
  resistencia: 3,
};

export const DIAS_POR_NIVEL: Record<NivelExperiencia, number> = {
  principiante: 3,
  intermedio: 4,
  avanzado: 5,
};

// ── Bloques diarios ──────────────────────────────────────────────────

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

// ── Plantillas semanales (salida "plantilla" del modelo) ─────────────

export const PLANTILLAS_SEMANALES: readonly PlantillaSemanal[] = [
  {
    id: "3d_fuerza",
    diasPorSemana: 3,
    enfasisCardio: false,
    bloques: [BLOQUE_EMPUJE, BLOQUE_TIRON, BLOQUE_PIERNA],
  },
  {
    id: "3d_cardio",
    diasPorSemana: 3,
    enfasisCardio: true,
    bloques: [BLOQUE_EMPUJE, BLOQUE_CARDIO, BLOQUE_PIERNA],
  },
  {
    id: "4d_fuerza",
    diasPorSemana: 4,
    enfasisCardio: false,
    bloques: [BLOQUE_EMPUJE, BLOQUE_TIRON, BLOQUE_PIERNA, BLOQUE_FULL],
  },
  {
    id: "4d_cardio",
    diasPorSemana: 4,
    enfasisCardio: true,
    bloques: [BLOQUE_EMPUJE, BLOQUE_TIRON, BLOQUE_CARDIO, BLOQUE_PIERNA],
  },
  {
    id: "5d_fuerza",
    diasPorSemana: 5,
    enfasisCardio: false,
    bloques: [
      BLOQUE_EMPUJE,
      BLOQUE_TIRON,
      BLOQUE_PIERNA,
      BLOQUE_EMPUJE,
      BLOQUE_TIRON,
    ],
  },
  {
    id: "5d_cardio",
    diasPorSemana: 5,
    enfasisCardio: true,
    bloques: [
      BLOQUE_EMPUJE,
      BLOQUE_TIRON,
      BLOQUE_PIERNA,
      BLOQUE_CARDIO,
      BLOQUE_FULL,
    ],
  },
];

/** Índice de la plantilla para N días (acotado a 3..5) con o sin énfasis en cardio. */
export function indicePlantilla(
  diasPorSemana: number,
  enfasisCardio: boolean,
): number {
  const dias = Math.min(5, Math.max(3, Math.round(diasPorSemana)));
  return PLANTILLAS_SEMANALES.findIndex(
    (p) => p.diasPorSemana === dias && p.enfasisCardio === enfasisCardio,
  );
}

/**
 * Traduce un par de clases (plantilla, esquema) a un `PlanHeuristico`.
 * Lo usan tanto la heurística como el modelo de IA, para que ambos
 * produzcan exactamente la misma estructura de salida.
 */
export function construirPlan(
  indicePlantillaSemanal: number,
  indiceEsquema: number,
): PlanHeuristico {
  const plantilla = PLANTILLAS_SEMANALES[indicePlantillaSemanal];
  const esquema = ESQUEMAS_CARGA[indiceEsquema];
  if (!plantilla || !esquema) {
    throw new Error(
      `Clase fuera de rango (plantilla=${indicePlantillaSemanal}, esquema=${indiceEsquema})`,
    );
  }
  return {
    diasPorSemana: plantilla.diasPorSemana,
    parametrosSerie: { ...esquema.parametros },
    bloques: plantilla.bloques,
  };
}

// ── Política de decisión (etiquetas del modelo de IA) ─────────────────
//
// Reglas basadas en recomendaciones generales de prescripción de ejercicio
// (ACSM / OMS). Son a la vez:
//   1. el respaldo (fallback) cuando el modelo TFLite no está disponible, y
//   2. la función con la que se etiqueta el dataset de entrenamiento
//      (`ml/entrenar_modelo_rutinas.py::etiquetar` es un port EXACTO de
//      `decidirClases`; si cambias una regla aquí, cámbiala allá y reentrena).

/** A partir de este IMC se prioriza el trabajo cardiovascular. */
export const UMBRAL_IMC_CARDIO = 30;
/** Adultos mayores: intensidad moderada (sin hipertrofia ni circuitos metabólicos). */
export const EDAD_ADULTO_MAYOR = 60;
/** Adolescentes: sin cargas de hipertrofia. */
export const EDAD_MINIMA_HIPERTROFIA = 16;

export interface PerfilPlan {
  objetivo: ObjetivoUsuario;
  nivel: NivelExperiencia;
  edad?: number;
  imc?: number;
  diasDisponibles?: number;
}

export interface ClasesPlan {
  indicePlantilla: number;
  indiceEsquema: number;
}

export function decidirClases(perfil: PerfilPlan): ClasesPlan {
  const { objetivo, nivel, edad, imc, diasDisponibles } = perfil;

  // Días: los que el usuario puede, sin superar lo recomendado para su nivel.
  const maximoNivel = DIAS_POR_NIVEL[nivel];
  const dias = Math.min(diasDisponibles ?? maximoNivel, maximoNivel);

  // Énfasis cardiovascular por objetivo o por IMC de obesidad.
  const enfasisCardio =
    objetivo === "perder_peso" ||
    objetivo === "resistencia" ||
    (imc !== undefined && imc >= UMBRAL_IMC_CARDIO);

  // Esquema de carga por objetivo, moderado por edad.
  let esquema = ESQUEMA_POR_OBJETIVO[objetivo];
  const HIPERTROFIA = ESQUEMA_POR_OBJETIVO.ganar_masa;
  const METABOLICO = ESQUEMA_POR_OBJETIVO.perder_peso;
  const GENERAL = ESQUEMA_POR_OBJETIVO.mantenimiento;
  if (
    edad !== undefined &&
    edad >= EDAD_ADULTO_MAYOR &&
    (esquema === HIPERTROFIA || esquema === METABOLICO)
  ) {
    esquema = GENERAL;
  }
  if (
    edad !== undefined &&
    edad < EDAD_MINIMA_HIPERTROFIA &&
    esquema === HIPERTROFIA
  ) {
    esquema = GENERAL;
  }

  return {
    indicePlantilla: indicePlantilla(dias, enfasisCardio),
    indiceEsquema: esquema,
  };
}

/**
 * Punto de entrada de la heurística: arma la estructura semanal.
 * Sin `datos` extra se comporta exactamente como la versión original
 * (solo objetivo y nivel).
 */
export function generarPlanHeuristico(
  objetivo: ObjetivoUsuario,
  nivel: NivelExperiencia,
  datos: Omit<PerfilPlan, "objetivo" | "nivel"> = {},
): PlanHeuristico {
  const clases = decidirClases({ objetivo, nivel, ...datos });
  return construirPlan(clases.indicePlantilla, clases.indiceEsquema);
}

/** Reparte una cantidad total de ejercicios entre N categorías lo más parejo posible. */
export function repartirCantidad(total: number, partes: number): number[] {
  const base = Math.floor(total / partes);
  const resto = total % partes;
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}
