import {
  construirFeatures,
  VALORES_POR_DEFECTO,
  type EntradaModelo,
} from "@/services/ai/features";
import { inferirRutina, VERSION_MODELO } from "@/services/ai/tfliteService";
import {
  construirPlan,
  decidirClases,
  type PlanHeuristico,
} from "@/utils/generadorRutinas";
import { calcularIMC } from "@/utils/imcCalculator";

/**
 * Decide la estructura de la rutina con el modelo de IA y, si no se puede
 * (modelo no disponible, error de inferencia o confianza baja), usa la
 * heurística como respaldo. Ambos caminos terminan en `construirPlan`, así
 * que la salida tiene siempre la misma forma.
 */

/** Por debajo de esta probabilidad se prefiere la heurística. */
export const CONFIANZA_MINIMA = 0.6;

export type OrigenPlan = "modelo" | "heuristica";

export interface ResultadoPlanificacion {
  plan: PlanHeuristico;
  origen: OrigenPlan;
  versionModelo?: string;
  /** Mínimo entre la confianza de plantilla y de esquema (solo si se usó el modelo). */
  confianza?: number;
  /** Por qué se usó la heurística (si aplica). */
  motivoRespaldo?: string;
}

const argmax = (valores: number[]) =>
  valores.reduce((mejor, v, i) => (v > valores[mejor] ? i : mejor), 0);

function planHeuristico(
  entrada: EntradaModelo,
  motivoRespaldo: string,
): ResultadoPlanificacion {
  const imc =
    entrada.altura && entrada.pesoActual
      ? calcularIMC(entrada.pesoActual, entrada.altura)
      : undefined;
  const clases = decidirClases({
    objetivo: entrada.objetivo,
    nivel: entrada.nivel,
    edad: entrada.edad,
    imc,
    diasDisponibles: entrada.diasDisponibles,
  });
  return {
    plan: construirPlan(clases.indicePlantilla, clases.indiceEsquema),
    origen: "heuristica",
    motivoRespaldo,
  };
}

export async function planificarRutina(
  entrada: EntradaModelo,
): Promise<ResultadoPlanificacion> {
  try {
    const salida = await inferirRutina(construirFeatures(entrada));
    const iPlantilla = argmax(salida.probabilidadesPlantilla);
    const iEsquema = argmax(salida.probabilidadesEsquema);
    const confianza = Math.min(
      salida.probabilidadesPlantilla[iPlantilla],
      salida.probabilidadesEsquema[iEsquema],
    );

    if (confianza < CONFIANZA_MINIMA) {
      return planHeuristico(
        entrada,
        `confianza baja (${confianza.toFixed(2)})`,
      );
    }
    return {
      plan: construirPlan(iPlantilla, iEsquema),
      origen: "modelo",
      versionModelo: VERSION_MODELO,
      confianza: Number(confianza.toFixed(3)),
    };
  } catch (error) {
    console.warn("Modelo de rutinas no disponible, uso heurística:", error);
    return planHeuristico(
      entrada,
      error instanceof Error ? error.message : "error del modelo",
    );
  }
}

export { VALORES_POR_DEFECTO };
