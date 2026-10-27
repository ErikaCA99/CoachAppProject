import {
  perfilPersistidoSchema,
  validarDocumento,
} from "@/schemas/persisted.schema";
import type { Usuario } from "@/models/entities/User";
import {
  actualizar,
  crearConId,
  eliminar,
  obtenerPorId,
  observarDocumento,
} from "@/services/firebase/firestoreService";

const validar = validarDocumento(perfilPersistidoSchema);

const COLECCION = "usuarios";

/** Crea el documento de perfil `usuarios/{uid}` (uid = Firebase Auth UID). */
export async function crearPerfilUsuario(
  uid: string,
  datos: Omit<Usuario, "id" | "creadoEn">,
): Promise<void> {
  await crearConId(COLECCION, uid, datos);
}

export async function obtenerPerfilUsuario(
  uid: string,
): Promise<Usuario | null> {
  return obtenerPorId<Usuario>(COLECCION, uid, validar);
}

export async function actualizarPerfilUsuario(
  uid: string,
  datos: Partial<Omit<Usuario, "id">>,
): Promise<void> {
  await actualizar<Usuario>(COLECCION, uid, datos);
}

/** Suscripción en tiempo real al perfil del usuario (para reflejar cambios al instante). */
export function observarPerfilUsuario(
  uid: string,
  callback: (usuario: Usuario | null) => void,
  onError?: (error: Error) => void,
) {
  return observarDocumento<Usuario>(COLECCION, uid, callback, onError, validar);
}

/** Elimina el documento de perfil del usuario. */
export async function eliminarPerfilUsuario(uid: string): Promise<void> {
  await eliminar(COLECCION, uid);
}
