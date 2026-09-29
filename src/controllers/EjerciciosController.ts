import type { Ejercicio } from "@/models/entities/Ejercicio";
import {
  actualizarEjercicio,
  crearEjercicio,
  eliminarEjercicio,
  listarEjercicios,
  obtenerEjercicioPorId,
  observarEjercicios,
} from "@/models/repositories/ejercicioRepository";
import {
  actualizarEjercicioSchema,
  ejercicioSchema,
} from "@/schemas/ejercicio.schema";
import type { ConId } from "@/services/firebase/firestoreService";

/**
 * Controlador (capa de negocio) para el catálogo público de ejercicios.
 * NOTA: la colección `ejercicios/` es de solo lectura para la app cliente;
 * la escritura se hace desde scripts de seed. Los métodos de escritura
 * existen aquí para completitud y uso futuro desde admin.
 */
export const EjerciciosController = {
  /** Crea un ejercicio en el catálogo con validación completa. */
  async crear(
    datos: Omit<Ejercicio, "id">,
  ): Promise<string> {
    const validacion = ejercicioSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de ejercicio inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    return crearEjercicio(validacion.data);
  },

  /** Obtiene un ejercicio por su ID. */
  async obtenerPorId(id: string): Promise<ConId<Ejercicio> | null> {
    return obtenerEjercicioPorId(id);
  },

  /** Lista todos los ejercicios del catálogo. */
  async listar(): Promise<ConId<Ejercicio>[]> {
    return listarEjercicios();
  },

  /** Actualiza parcialmente un ejercicio existente con validación. */
  async actualizar(
    id: string,
    datos: Partial<Omit<Ejercicio, "id">>,
  ): Promise<void> {
    const validacion = actualizarEjercicioSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de actualización inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    await actualizarEjercicio(id, validacion.data);
  },

  /** Elimina un ejercicio del catálogo. */
  async eliminar(id: string): Promise<void> {
    await eliminarEjercicio(id);
  },

  /** Suscripción en tiempo real al catálogo de ejercicios. */
  observar: observarEjercicios,
};
