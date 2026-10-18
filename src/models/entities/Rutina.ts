import type { NivelExperiencia, ObjetivoUsuario } from "./Usuario";

export type TipoRutina = "ia" | "personalizada";

export interface EjercicioRutina {
  /** Id del ejercicio en wger (nombre histórico: antes el catálogo era wger). */
  maquinaId: number;
  /** Id de la máquina del catálogo (`maquinas/{id}`) si se agregó desde su ficha. */
  maquinaCatalogoId?: string;
  nombre: string;
  imagenUrl: string | null;
  series: number;
  repeticiones: number;
  descansoSegundos: number;
}

export interface DiaRutina {
  dia: number; // 1..7
  enfoque: string; // p.ej. "Pecho, Hombros y Brazos"
  ejercicios: EjercicioRutina[];
}

export interface Rutina {
  nombre: string;
  tipo: TipoRutina;
  objetivo?: ObjetivoUsuario;
  nivel?: NivelExperiencia;
  diasPorSemana: number;
  planSemanal: DiaRutina[];
  usuarioId: string;
  /** Solo rutinas "ia": si la estructura la decidió el modelo TFLite o la heurística de respaldo. */
  origenPlan?: "modelo" | "heuristica";
  /** Versión del modelo que generó la rutina (trazabilidad / reentrenamiento). */
  versionModelo?: string;
  /** Confianza del modelo (0..1) cuando `origenPlan` es "modelo". */
  confianzaModelo?: number;
  creadoEn?: Date;
}
