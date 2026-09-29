import type { Rutina } from "@/models/entities/Rutina";
import {
  actualizar,
  crear,
  eliminar,
  listar,
  obtenerPorId,
  observarPorUsuario,
  type ConId,
} from "@/services/firebase/firestoreService";

/** Única función que conoce la ruta real de la subcolección de rutinas. */
function coleccion(usuarioId: string): string {
  return `usuarios/${usuarioId}/rutinas`;
}

export async function guardarRutina(
  usuarioId: string,
  rutina: Omit<Rutina, "creadoEn">,
): Promise<string> {
  return crear(coleccion(usuarioId), rutina);
}

export async function listarRutinas(
  usuarioId: string,
): Promise<ConId<Rutina>[]> {
  return listar<Rutina>(coleccion(usuarioId), {
    ordenarPor: "creadoEn",
    direccion: "desc",
  });
}

export async function obtenerRutina(
  usuarioId: string,
  rutinaId: string,
): Promise<ConId<Rutina> | null> {
  return obtenerPorId<Rutina>(coleccion(usuarioId), rutinaId);
}

export async function actualizarRutina(
  usuarioId: string,
  rutinaId: string,
  datos: Partial<Omit<Rutina, "creadoEn" | "usuarioId">>,
): Promise<void> {
  await actualizar<Rutina>(coleccion(usuarioId), rutinaId, datos);
}

export async function eliminarRutina(
  usuarioId: string,
  rutinaId: string,
): Promise<void> {
  return eliminar(coleccion(usuarioId), rutinaId);
}

/** Suscripción en tiempo real a todas las rutinas guardadas del usuario. */
export function observarRutinas(
  usuarioId: string,
  callback: (rutinas: ConId<Rutina>[]) => void,
) {
  return observarPorUsuario<Rutina>(usuarioId, "rutinas", callback, {
    ordenarPor: "creadoEn",
    direccion: "desc",
  });
}
