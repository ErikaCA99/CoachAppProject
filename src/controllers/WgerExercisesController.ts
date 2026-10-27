import type {
  CategoriaEjercicio,
  EjercicioWger,
  EquipoEjercicio,
} from "@/models/entities/WgerExercise";
import type { ImagenEjercicioWger } from "@/models/entities/WgerExerciseImage";
import { obtenerImagenRespaldoWger } from "@/models/repositories/wgerImageRepository";
import {
  listarCategoriasEjercicios,
  listarEjercicios,
  listarEquiposEjercicios,
  obtenerEjercicio,
  type ResultadoListarEjercicios,
} from "@/models/repositories/wgerExerciseRepository";

/**
 * Controlador (capa de negocio) para los ejercicios de wger que usan las
 * rutinas. Las Vistas nunca importan `wgerService` ni el repositorio.
 *
 * El id numérico de wger es el `maquinaId` que guarda cada `EjercicioRutina`
 * (nombre histórico); las máquinas del catálogo lo referencian en `wgerIds`.
 */
export const EjerciciosWgerController = {
  async listar(opciones: {
    categoriaId?: number;
    equipoId?: number;
    busqueda?: string;
    offset?: number;
  }): Promise<ResultadoListarEjercicios> {
    return listarEjercicios(opciones);
  },

  async obtenerPorId(id: number): Promise<EjercicioWger | null> {
    return obtenerEjercicio(id);
  },

  /** Foto/GIF del catálogo propio para ejercicios que wger no ilustra. */
  async obtenerImagenRespaldo(
    wgerId: number,
  ): Promise<ImagenEjercicioWger | null> {
    return obtenerImagenRespaldoWger(wgerId);
  },

  listarCategorias(): CategoriaEjercicio[] {
    return listarCategoriasEjercicios();
  },

  listarEquipos(): EquipoEjercicio[] {
    return listarEquiposEjercicios();
  },
};
