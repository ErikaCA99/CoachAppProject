import type { Maquina, TipoMaquina } from "@/models/entities/Maquina";
import {
  listarMaquinas,
  obtenerMaquina,
  obtenerUrlArchivo,
} from "@/models/repositories/maquinaRepository";
import {
  CONFIANZA_MINIMA,
  reconocerMaquina,
} from "@/services/ai/reconocimientoMaquinas";

export interface FiltrosMaquinas {
  busqueda?: string;
  categoria?: string;
  tipo?: TipoMaquina;
}

/** Quita tildes y pasa a minúsculas para buscar "prensa" = "Prensa", "biceps" = "bíceps". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Controlador (capa de negocio) del catálogo de máquinas del gimnasio.
 * Las Vistas de `(app)/machines/*` solo llaman a este controlador; nunca
 * importan Firestore, Storage ni el repositorio.
 */
export const MaquinasController = {
  /** Catálogo completo, ordenado por categoría y nombre. */
  async listar(filtros: FiltrosMaquinas = {}): Promise<Maquina[]> {
    return MaquinasController.filtrar(await listarMaquinas(), filtros);
  },

  /**
   * Regla de filtrado (pura y síncrona, para usarla con `useMemo` en la Vista):
   * texto en nombre, categoría, músculos y ejercicios; más categoría y tipo.
   */
  filtrar(catalogo: Maquina[], filtros: FiltrosMaquinas): Maquina[] {
    const texto = filtros.busqueda ? normalizar(filtros.busqueda) : "";
    return catalogo.filter((m) => {
      if (filtros.categoria && m.categoria !== filtros.categoria) return false;
      if (filtros.tipo && m.tipo !== filtros.tipo) return false;
      if (!texto) return true;
      const campos = [
        m.nombre,
        m.categoria,
        ...m.musculosPrincipales,
        ...m.musculosSecundarios,
        ...m.ejercicios.map((e) => e.nombre),
        ...m.ejerciciosGif.map((e) => e.nombre),
      ];
      return campos.some((campo) => normalizar(campo).includes(texto));
    });
  },

  /** Recarga el catálogo desde Firestore (p. ej. pull-to-refresh). */
  async recargar(): Promise<void> {
    await listarMaquinas({ forzar: true });
  },

  /** Categorías presentes en el catálogo, en el orden del catálogo. */
  async listarCategorias(): Promise<string[]> {
    const catalogo = await listarMaquinas();
    return [...new Set(catalogo.map((m) => m.categoria))];
  },

  async obtenerPorId(id: string): Promise<Maquina | null> {
    return obtenerMaquina(id);
  },

  /** Máquina que contiene un ejercicio de wger (los `maquinaId` de las rutinas). */
  async buscarPorWgerId(wgerId: number): Promise<Maquina | null> {
    const catalogo = await listarMaquinas();
    return catalogo.find((m) => m.wgerIds.includes(wgerId)) ?? null;
  },

  /** URL de descarga de una ruta de Storage guardada en el catálogo. */
  async obtenerUrl(ruta: string): Promise<string> {
    return obtenerUrlArchivo(ruta);
  },

  /**
   * Intenta reconocer la máquina de una foto. Devuelve `null` si no hay
   * modelo o si la confianza es baja: la Vista debe pedir confirmación.
   */
  async reconocerDesdeFoto(fotoUri: string): Promise<Maquina | null> {
    const resultado = await reconocerMaquina(fotoUri);
    if (!resultado || resultado.confianza < CONFIANZA_MINIMA) return null;
    return obtenerMaquina(resultado.maquinaId);
  },
};
