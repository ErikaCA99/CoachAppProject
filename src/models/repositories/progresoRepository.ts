import type { ProgresoFisico } from "@/models/entities/ProgresoFisico";
import {
  actualizar,
  crear,
  eliminar,
  listar,
  observarPorUsuario,
  type ConId,
} from "@/services/firebase/firestoreService";

/** Única función que conoce la ruta real de la subcolección de progreso físico. */
function coleccion(usuarioId: string): string {
  return `usuarios/${usuarioId}/progresoFisico`;
}

export async function registrarProgreso(
  usuarioId: string,
  registro: Omit<ProgresoFisico, "creadoEn">,
): Promise<string> {
  return crear(coleccion(usuarioId), registro);
}

export async function listarProgreso(
  usuarioId: string,
): Promise<ConId<ProgresoFisico>[]> {
  return listar<ProgresoFisico>(coleccion(usuarioId), {
    ordenarPor: "creadoEn",
    direccion: "asc",
  });
}

export async function eliminarProgreso(
  usuarioId: string,
  registroId: string,
): Promise<void> {
  return eliminar(coleccion(usuarioId), registroId);
}

/** Actualiza parcialmente un registro de progreso existente. */
export async function actualizarProgreso(
  usuarioId: string,
  registroId: string,
  datos: Partial<Omit<ProgresoFisico, "creadoEn" | "usuarioId">>,
): Promise<void> {
  await actualizar<ProgresoFisico>(coleccion(usuarioId), registroId, datos);
}

/** Suscripción en tiempo real al historial de progreso físico (orden cronológico, para graficar). */
export function observarProgreso(
  usuarioId: string,
  callback: (registros: ConId<ProgresoFisico>[]) => void,
) {
  return observarPorUsuario<ProgresoFisico>(
    usuarioId,
    "progresoFisico",
    callback,
    {
      ordenarPor: "creadoEn",
      direccion: "asc",
    },
  );
}
