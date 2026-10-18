import type { EjercicioWger } from "@/models/entities/EjercicioWger";
import type {
  EjercicioGif,
  Maquina,
  TipoMaquina,
} from "@/models/entities/Maquina";
import type { EjercicioRutina } from "@/models/entities/Rutina";
import { obtenerEjercicio } from "@/models/repositories/ejercicioWgerRepository";
import {
  listarMaquinas,
  obtenerMaquina,
  obtenerUrlArchivo,
} from "@/models/repositories/maquinaRepository";
import {
  CONFIANZA_MINIMA,
  reconocerMaquina,
} from "@/services/ai/reconocimientoMaquinas";
import {
  buscarEjercicioRelacionado,
  generarDetalleEjercicio,
  type DetalleEjercicioGenerado,
} from "@/utils/ejercicioMaquina";
import { normalizarTexto } from "@/utils/texto";

export interface FiltrosMaquinas {
  busqueda?: string;
  categoria?: string;
  tipo?: TipoMaquina;
}

/** Máquinas de una misma categoría (grupo muscular), en el orden del catálogo. */
export interface GrupoMaquinas {
  categoria: string;
  maquinas: Maquina[];
}

/** Resultado del reconocimiento por cámara. */
export interface ResultadoEscaneo {
  maquina: Maquina;
  /** 0..1 */
  confianza: number;
  /** `true` si la confianza no alcanza el umbral: el usuario debe confirmar. */
  requiereConfirmacion: boolean;
}

/** Detalle de un ejercicio de la ficha: de wger si existe, o generado localmente. */
export type DetalleEjercicioResuelto =
  | { origen: "wger"; detalle: EjercicioWger }
  | { origen: "generado"; detalle: DetalleEjercicioGenerado };

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
    const texto = filtros.busqueda ? normalizarTexto(filtros.busqueda) : "";
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
      return campos.some((campo) => normalizarTexto(campo).includes(texto));
    });
  },

  /** Agrupa por categoría (grupo muscular) respetando el orden recibido. */
  agruparPorCategoria(maquinas: Maquina[]): GrupoMaquinas[] {
    const grupos = new Map<string, Maquina[]>();
    for (const maquina of maquinas) {
      const lista = grupos.get(maquina.categoria);
      if (lista) lista.push(maquina);
      else grupos.set(maquina.categoria, [maquina]);
    }
    return [...grupos].map(([categoria, lista]) => ({
      categoria,
      maquinas: lista,
    }));
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

  /**
   * Id de la máquina del catálogo a la que pertenece un ejercicio de rutina,
   * o `null` si no usa ninguna (p. ej. peso libre).
   */
  async resolverMaquinaIdDeEjercicio(
    ejercicio: EjercicioRutina,
  ): Promise<string | null> {
    if (ejercicio.maquinaCatalogoId) return ejercicio.maquinaCatalogoId;
    const maquina = await MaquinasController.buscarPorWgerId(
      ejercicio.maquinaId,
    );
    return maquina?.id ?? null;
  },

  /**
   * Detalle de un ejercicio con GIF de la ficha. Usa el ejercicio de wger
   * relacionado; si no existe o falla la red, genera un detalle de respaldo
   * a partir de los datos de la máquina (la Vista nunca queda sin contenido).
   */
  async obtenerDetalleEjercicio(
    maquina: Maquina,
    ejercicioGif: EjercicioGif,
  ): Promise<DetalleEjercicioResuelto> {
    const wgerId = buscarEjercicioRelacionado(maquina, ejercicioGif)?.wgerId;
    if (wgerId) {
      try {
        const detalle = await obtenerEjercicio(wgerId);
        if (detalle) return { origen: "wger", detalle };
      } catch (error) {
        console.warn("No se pudo cargar el detalle del ejercicio:", error);
      }
    }
    return {
      origen: "generado",
      detalle: generarDetalleEjercicio(maquina, ejercicioGif),
    };
  },

  /** URL de descarga de una ruta de Storage guardada en el catálogo. */
  async obtenerUrl(ruta: string): Promise<string> {
    return obtenerUrlArchivo(ruta);
  },

  /**
   * Intenta reconocer la máquina de una foto. Devuelve `null` si no hay
   * modelo o no hubo predicción. Si la confianza no alcanza
   * `CONFIANZA_MINIMA`, la predicción se devuelve igualmente como
   * sugerencia (`requiereConfirmacion: true`) y la Vista pide confirmarla.
   */
  async reconocerDesdeFoto(fotoUri: string): Promise<ResultadoEscaneo | null> {
    const resultado = await reconocerMaquina(fotoUri);
    if (!resultado) return null;
    const maquina = await obtenerMaquina(resultado.maquinaId);
    if (!maquina) return null;
    return {
      maquina,
      confianza: resultado.confianza,
      requiereConfirmacion: resultado.confianza < CONFIANZA_MINIMA,
    };
  },
};
