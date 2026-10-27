import {
  progresoPersistidoSchema,
  validarDocumento,
} from "@/schemas/persisted.schema";
import type { OpcionesConsulta } from "@/services/firebase/firestoreService";
import type { ProgresoFisico } from "@/models/entities/PhysicalProgress";
import type { ConId } from "@/models/types";
import {
  actualizar,
  crear,
  eliminar,
  listar,
  obtenerPorId,
  observarPorUsuario,
} from "@/services/firebase/firestoreService";

const validar = validarDocumento(progresoPersistidoSchema);

/** Única función que conoce la ruta real de la subcolección de progreso físico. */
function coleccion(usuarioId: string): string {
  return `usuarios/${usuarioId}/progresoFisico`;
}

export function obtenerProgreso(
  usuarioId: string,
  registroId: string,
): Promise<ConId<ProgresoFisico> | null> {
  return obtenerPorId<ProgresoFisico>(
    coleccion(usuarioId),
    registroId,
    validar,
  );
}

export async function registrarProgreso(
  usuarioId: string,
  registro: Omit<ProgresoFisico, "creadoEn">,
): Promise<string> {
  return crear(coleccion(usuarioId), registro);
}

export async function listarProgreso(
  usuarioId: string,
  intervalo: Pick<OpcionesConsulta, "desde" | "hasta"> = {},
): Promise<ConId<ProgresoFisico>[]> {
  return listar<ProgresoFisico>(coleccion(usuarioId), {
    ...intervalo,
    validar,
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
  onError?: (error: Error) => void,
) {
  return observarPorUsuario<ProgresoFisico>(
    usuarioId,
    "progresoFisico",
    (items) => callback([...items].reverse()),
    {
      validar,
      ordenarPor: "creadoEn",
      direccion: "desc",
      onError,
    },
  );
}
