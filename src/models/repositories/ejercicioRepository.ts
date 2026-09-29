import type { Ejercicio } from "@/models/entities/Ejercicio";
import {
  actualizar,
  crear,
  eliminar,
  listar,
  obtenerPorId,
  observar,
  type ConId,
} from "@/services/firebase/firestoreService";

/**
 * Repositorio para la colección pública `ejercicios/`.
 * NOTA: esta colección es de solo lectura para la app cliente. La escritura
 * se hace únicamente desde scripts de seed con el SDK Admin. Los métodos
 * de escritura existen aquí para completitud y uso futuro desde admin.
 */

const COLECCION = "ejercicios";

/** Crea un ejercicio en el catálogo público. */
export async function crearEjercicio(
  datos: Omit<Ejercicio, "id">,
): Promise<string> {
  return crear(COLECCION, datos);
}

/** Obtiene un ejercicio por su ID. */
export async function obtenerEjercicioPorId(
  id: string,
): Promise<ConId<Ejercicio> | null> {
  return obtenerPorId<Ejercicio>(COLECCION, id);
}

/** Lista todos los ejercicios del catálogo. */
export async function listarEjercicios(): Promise<ConId<Ejercicio>[]> {
  return listar<Ejercicio>(COLECCION, {
    ordenarPor: "nombre",
    direccion: "asc",
  });
}

/** Actualiza parcialmente un ejercicio existente. */
export async function actualizarEjercicio(
  id: string,
  datos: Partial<Omit<Ejercicio, "id">>,
): Promise<void> {
  await actualizar<Ejercicio>(COLECCION, id, datos);
}

/** Elimina un ejercicio del catálogo. */
export async function eliminarEjercicio(id: string): Promise<void> {
  await eliminar(COLECCION, id);
}

/** Suscripción en tiempo real al catálogo de ejercicios. */
export function observarEjercicios(
  callback: (ejercicios: ConId<Ejercicio>[]) => void,
) {
  return observar<Ejercicio>(COLECCION, callback, {
    ordenarPor: "nombre",
    direccion: "asc",
  });
}
