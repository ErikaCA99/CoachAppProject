import type { CategoriaMaquina, Maquina } from "@/models/entities/Maquina";
import {
  listarCategoriasMaquinas,
  listarMaquinas,
  obtenerMaquinaPorId,
  type ResultadoListarMaquinas,
} from "@/models/repositories/maquinaRepository";

/**
 * Controlador (capa de negocio) para el catálogo de máquinas/ejercicios.
 * La Vista (`(app)/machines/*`) solo llama a este controlador; nunca
 * importa `wgerService` ni `maquinaRepository` directamente.
 */
export const MaquinasController = {
  async listar(opciones: {
    categoriaId?: number;
    busqueda?: string;
    offset?: number;
  }): Promise<ResultadoListarMaquinas> {
    return listarMaquinas(opciones);
  },

  async obtenerPorId(id: number): Promise<Maquina | null> {
    return obtenerMaquinaPorId(id);
  },

  listarCategorias(): CategoriaMaquina[] {
    return listarCategoriasMaquinas();
  },
};
