import { create } from "axios";

/**
 * Cliente crudo de la API pública de wger (https://wger.de/api/v2/).
 * Sin conocimiento de dominio: solo tipos y llamadas HTTP tal como los
 * devuelve wger. El mapeo a la entidad `EjercicioWger` vive en
 * `src/models/repositories/ejercicioWgerRepository.ts`.
 */

const WGER_BASE_URL = "https://wger.de/api/v2";

export interface WgerPaginado<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface WgerCategoria {
  id: number;
  name: string;
}

export interface WgerMusculo {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
}

export interface WgerEquipo {
  id: number;
  name: string;
}

export interface WgerImagen {
  id: number;
  image: string;
  thumbnails: { small: string; medium: string };
  is_main: boolean;
}

export interface WgerVideo {
  id: number;
  video: string;
}

export interface WgerTraduccion {
  id: number;
  name: string;
  description: string;
  language: number;
}

export interface WgerExerciseInfo {
  id: number;
  uuid: string;
  category: WgerCategoria;
  muscles: WgerMusculo[];
  muscles_secondary: WgerMusculo[];
  equipment: WgerEquipo[];
  images: WgerImagen[];
  videos: WgerVideo[];
  translations: WgerTraduccion[];
}

const cliente = create({
  baseURL: WGER_BASE_URL,
  timeout: 15000,
  params: { format: "json" },
});

export interface FiltrosEjercicios {
  categoria?: number;
  equipo?: number;
  busqueda?: string;
  limite?: number;
  offset?: number;
}

/** Lista ejercicios/máquinas paginados desde wger, con filtros opcionales. */
export async function listarEjerciciosWger(
  filtros: FiltrosEjercicios = {},
): Promise<WgerPaginado<WgerExerciseInfo>> {
  const { data } = await cliente.get<WgerPaginado<WgerExerciseInfo>>(
    "/exerciseinfo/",
    {
      params: {
        category: filtros.categoria,
        equipment: filtros.equipo,
        limit: filtros.limite ?? 20,
        offset: filtros.offset ?? 0,
        search: filtros.busqueda || undefined,
      },
    },
  );
  return data;
}

/** Obtiene el detalle completo de un ejercicio/máquina por su ID. */
export async function obtenerEjercicioWgerPorId(
  id: number,
): Promise<WgerExerciseInfo> {
  const { data } = await cliente.get<WgerExerciseInfo>(`/exerciseinfo/${id}/`);
  return data;
}
