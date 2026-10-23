import type { Rutina } from "@/models/entities/Routine";
import type { Entrenamiento } from "@/models/entities/Workout";
import {
  desmarcarEntrenamiento,
  marcarEntrenamiento,
  observarEntrenamientos,
} from "@/models/repositories/workoutRepository";
import { marcarEntrenamientoSchema } from "@/schemas/workout.schema";
import type { ConId } from "@/models/types";
import {
  calcularDiaSugerido,
  calcularResumenEntrenamientos,
  formatearFechaISO,
  type ResumenEntrenamientos,
} from "@/utils/workoutStats";

/**
 * Controlador (capa de negocio) para el seguimiento de entrenamientos
 * completados (racha, semana actual, total histórico). La Vista solo llama
 * a este controlador; nunca importa el repositorio ni `entrenamientoStats`
 * directamente.
 */
export const EntrenamientosController = {
  /** Marca (o reemplaza) el entrenamiento de hoy para el día `numeroDia` de la rutina. */
  async marcarCompletadoHoy(
    usuarioId: string,
    rutinaId: string,
    numeroDia: number,
  ): Promise<void> {
    const fecha = formatearFechaISO(new Date());
    const validacion = marcarEntrenamientoSchema.safeParse({
      rutinaId,
      dia: numeroDia,
      fecha,
    });
    if (!validacion.success) {
      throw new Error(
        `Entrenamiento inválido: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    await marcarEntrenamiento(usuarioId, { usuarioId, ...validacion.data });
  },

  /** Desmarca el entrenamiento de hoy (si lo hubiera). */
  async desmarcarHoy(usuarioId: string): Promise<void> {
    await desmarcarEntrenamiento(usuarioId, formatearFechaISO(new Date()));
  },

  observar: observarEntrenamientos,

  /** Deriva racha, semana actual y total a partir de la lista observada. */
  resumen(
    entrenamientos: ConId<Entrenamiento>[],
    ahora: Date = new Date(),
  ): ResumenEntrenamientos {
    return calcularResumenEntrenamientos(
      entrenamientos.map((e) => e.fecha),
      ahora,
    );
  },

  /** El entrenamiento marcado para hoy, o `null` si ninguno. */
  deHoy(
    entrenamientos: ConId<Entrenamiento>[],
    ahora: Date = new Date(),
  ): ConId<Entrenamiento> | null {
    const hoyISO = formatearFechaISO(ahora);
    return entrenamientos.find((e) => e.fecha === hoyISO) ?? null;
  },

  /**
   * Día de la rutina que toca entrenar: el siguiente al último completado
   * de esa misma rutina (la lista llega ordenada de más reciente a más
   * antigua). `null` si la rutina no tiene días.
   */
  diaSugerido(
    rutina: Pick<Rutina, "planSemanal"> & { id: string },
    entrenamientos: ConId<Entrenamiento>[],
  ): number | null {
    const ultimo = entrenamientos.find((e) => e.rutinaId === rutina.id);
    return calcularDiaSugerido(
      rutina.planSemanal.map((d) => d.dia),
      ultimo?.dia ?? null,
    );
  },
};
