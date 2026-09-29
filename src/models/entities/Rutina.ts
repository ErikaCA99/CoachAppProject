import type { Timestamp } from "firebase/firestore";

import type { NivelExperiencia, ObjetivoUsuario } from "./Usuario";

export type TipoRutina = "ia" | "personalizada";

export interface EjercicioRutina {
  maquinaId: number;
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
  creadoEn?: Timestamp;
}
