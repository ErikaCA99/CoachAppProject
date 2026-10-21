import { create, isAxiosError } from "axios";

import { env } from "@/config/env";

/**
 * Cliente crudo de USDA FoodData Central (https://fdc.nal.usda.gov/api-guide).
 * Sin conocimiento de dominio: solo tipos y llamadas HTTP tal como los
 * devuelve la API. El mapeo a la entidad `AlimentoUSDA` vive en
 * `src/models/repositories/foodRepository.ts`.
 *
 * Límite: 1.000 solicitudes/hora por key. Datos en dominio público (CC0).
 */

const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = env.foodDataApiKey;

/**
 * Solo alimentos genéricos (no marcas comerciales de EE. UU.).
 * En ambos tipos los nutrientes vienen expresados por 100 g.
 */
const TIPOS_DATOS = ["Foundation", "SR Legacy"] as const;

export interface UsdaNutriente {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber?: string;
  unitName: string; // "KCAL", "G", "MG"...
  value: number;
}

export interface UsdaAlimento {
  fdcId: number;
  description: string;
  dataType: string;
  foodCategory?: string;
  foodNutrients: UsdaNutriente[];
}

export interface UsdaRespuestaBusqueda {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: UsdaAlimento[];
}

const usda = create({ baseURL: USDA_BASE_URL, timeout: 10_000 });

/** `POST /foods/search` — búsqueda por texto (en inglés). */
export async function buscarAlimentosUsda(
  consulta: string,
  opciones: { tamanoPagina?: number; signal?: AbortSignal } = {},
): Promise<UsdaAlimento[]> {
  if (!API_KEY) {
    throw new Error(
      "Falta EXPO_PUBLIC_FOOD_DATA_API_KEY en el archivo .env (reinicia Expo con `npx expo start -c`).",
    );
  }

  try {
    const { data } = await usda.post<UsdaRespuestaBusqueda>(
      "/foods/search",
      {
        query: consulta,
        dataType: TIPOS_DATOS,
        pageSize: opciones.tamanoPagina ?? 15,
      },
      { params: { api_key: API_KEY }, signal: opciones.signal },
    );
    return data.foods ?? [];
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 429) {
        throw new Error(
          "Se alcanzó el límite de consultas de USDA. Intenta en unos minutos.",
        );
      }
      if (status === 401 || status === 403) {
        throw new Error("La API key de USDA FoodData Central no es válida.");
      }
      if (!error.response && error.code !== "ERR_CANCELED") {
        throw new Error("Sin conexión con USDA. Revisa tu internet.");
      }
    }
    throw error;
  }
}
