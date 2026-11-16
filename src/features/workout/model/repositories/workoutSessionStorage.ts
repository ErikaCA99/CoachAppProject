import { localStore } from "@/core/storage/localStore";

import { formatearFechaISO } from "@/features/workout/model/rules/workoutStats";
import type {
  EjercicioSesion,
  SesionEntrenamiento,
} from "@/features/workout/model/rules/workoutSession";

/**
 * Persistencia de la sesión de "Entrenar hoy": si Android cierra la app (o el
 * usuario sale a otra aplicación y tarda en volver) el avance se retoma. Solo
 * se conserva una sesión, la del día de hoy; una guardada otro día se descarta.
 */
const CLAVE = "coachapp:sesion-entrenamiento:v1";

export interface SesionGuardada {
  uid: string;
  rutinaId: string;
  numeroDia: number;
  /** Fecha local `YYYY-MM-DD` en que se empezó. */
  fecha: string;
  /** Instante (ms epoch) en que empezó la sesión, para la duración total. */
  inicioMs: number;
  sesion: SesionEntrenamiento;
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

/** Valida la forma de lo leído del almacenamiento (puede estar corrupto). */
export function esSesionGuardada(valor: unknown): valor is SesionGuardada {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  if (
    typeof v.uid !== "string" ||
    typeof v.rutinaId !== "string" ||
    typeof v.fecha !== "string" ||
    !esNumero(v.numeroDia) ||
    !esNumero(v.inicioMs)
  ) {
    return false;
  }
  const s = v.sesion as Record<string, unknown> | null;
  if (typeof s !== "object" || s === null) return false;
  return (
    Array.isArray(s.ejercicios) &&
    s.ejercicios.every(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        esNumero((e as EjercicioSesion).series) &&
        esNumero((e as EjercicioSesion).descansoSegundos),
    ) &&
    esNumero(s.indice) &&
    esNumero(s.serie) &&
    (s.descansoTerminaEn === null || esNumero(s.descansoTerminaEn)) &&
    Array.isArray(s.omitidos) &&
    s.omitidos.every(esNumero) &&
    typeof s.terminado === "boolean"
  );
}

/**
 * ¿La sesión guardada sigue siendo válida para este día de la rutina?
 * Debe ser del mismo usuario, rutina y día, de hoy, con los mismos ejercicios
 * (si la rutina se editó, mejor empezar de cero) y un avance coherente.
 */
export function sesionCompatible(
  guardada: SesionGuardada,
  contexto: {
    uid: string;
    rutinaId: string;
    numeroDia: number;
    ejercicios: readonly EjercicioSesion[];
    hoy?: Date;
  },
): boolean {
  const { sesion } = guardada;
  if (
    guardada.uid !== contexto.uid ||
    guardada.rutinaId !== contexto.rutinaId ||
    guardada.numeroDia !== contexto.numeroDia ||
    guardada.fecha !== formatearFechaISO(contexto.hoy ?? new Date())
  ) {
    return false;
  }
  if (sesion.ejercicios.length !== contexto.ejercicios.length) return false;
  const iguales = sesion.ejercicios.every(
    (e, i) =>
      e.series === contexto.ejercicios[i].series &&
      e.descansoSegundos === contexto.ejercicios[i].descansoSegundos,
  );
  if (!iguales) return false;
  return (
    Number.isInteger(sesion.indice) &&
    sesion.indice >= 0 &&
    sesion.indice <= sesion.ejercicios.length &&
    Number.isInteger(sesion.serie) &&
    sesion.serie >= 1
  );
}

export async function guardarSesionEnCurso(
  datos: SesionGuardada,
): Promise<void> {
  try {
    await localStore.guardar(CLAVE, JSON.stringify(datos));
  } catch (error) {
    // Es una ayuda: si no se puede guardar, el entrenamiento sigue igual.
    console.warn("No se pudo guardar la sesión de entrenamiento:", error);
  }
}

/** Sesión guardada del usuario, o `null` si no hay, es de otro día o está corrupta. */
export async function leerSesionEnCurso(
  uid: string,
  hoy: Date = new Date(),
): Promise<SesionGuardada | null> {
  try {
    const crudo = await localStore.obtener(CLAVE);
    if (!crudo) return null;
    const dato: unknown = JSON.parse(crudo);
    if (
      !esSesionGuardada(dato) ||
      dato.uid !== uid ||
      dato.fecha !== formatearFechaISO(hoy)
    ) {
      return null;
    }
    return dato;
  } catch {
    return null;
  }
}

export async function borrarSesionEnCurso(): Promise<void> {
  try {
    await localStore.eliminar(CLAVE);
  } catch (error) {
    console.warn("No se pudo borrar la sesión de entrenamiento:", error);
  }
}
