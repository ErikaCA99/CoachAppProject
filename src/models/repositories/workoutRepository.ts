import {
  entrenamientoPersistidoSchema,
  validarDocumento,
} from "@/schemas/persisted.schema";
import type { OpcionesConsulta } from "@/services/firebase/firestoreService";
import type { Entrenamiento } from "@/models/entities/Workout";
import type { ConId } from "@/models/types";
import {
  guardarConFecha,
  eliminar,
  listar,
  observarPorUsuario,
} from "@/services/firebase/firestoreService";

const validar = validarDocumento(entrenamientoPersistidoSchema);

/** Única función que conoce la ruta real de la subcolección de entrenamientos. */
function coleccion(usuarioId: string): string {
  return `usuarios/${usuarioId}/entrenamientos`;
}

/**
 * Crea o reemplaza el entrenamiento de un día de calendario (upsert por
 * fecha: el ID del documento es la fecha, así nunca hay dos registros para
 * el mismo día).
 */
export async function marcarEntrenamiento(
  usuarioId: string,
  entrenamiento: Omit<Entrenamiento, "creadoEn">,
): Promise<void> {
  await guardarConFecha(
    coleccion(usuarioId),
    entrenamiento.fecha,
    entrenamiento,
  );
}

/** Quita el entrenamiento registrado para una fecha (desmarcar el día). */
export async function desmarcarEntrenamiento(
  usuarioId: string,
  fecha: string,
): Promise<void> {
  await eliminar(coleccion(usuarioId), fecha);
}

/** Suscripción en tiempo real a los entrenamientos completados del usuario. */
export function observarEntrenamientos(
  usuarioId: string,
  callback: (entrenamientos: ConId<Entrenamiento>[]) => void,
  onError?: (error: Error) => void,
) {
  return observarPorUsuario<Entrenamiento>(
    usuarioId,
    "entrenamientos",
    callback,
    { validar, ordenarPor: "fecha", direccion: "desc", onError },
  );
}

/** Lectura única de todos los entrenamientos (para reportes). */
export async function listarEntrenamientos(
  usuarioId: string,
  intervalo: Pick<OpcionesConsulta, "desde" | "hasta"> = {},
): Promise<ConId<Entrenamiento>[]> {
  return listar<Entrenamiento>(coleccion(usuarioId), {
    ...intervalo,
    validar,
    ordenarPor: "fecha",
    direccion: "asc",
  });
}
