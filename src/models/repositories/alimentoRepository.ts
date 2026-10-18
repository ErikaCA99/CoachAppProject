import type { AlimentoUSDA } from "@/models/entities/AlimentoUSDA";
import {
  buscarAlimentosUsda,
  type UsdaAlimento,
  type UsdaNutriente,
} from "@/services/usda/usdaService";
import { traducirDescripcionUSDA } from "@/utils/traductorAlimentos";

/**
 * IDs de nutrientes de FoodData Central.
 * Energía: 1008 (kcal). Algunos alimentos "Foundation" no traen 1008 y
 * reportan la energía con factores de Atwater: 2047 (general) / 2048 (específico).
 */
const NUTRIENTE = {
  energia: [1008, 2047, 2048],
  proteinas: [1003],
  grasas: [1004],
  carbohidratos: [1005],
} as const;

function obtenerValor(
  nutrientes: UsdaNutriente[],
  ids: readonly number[],
  unidad: string,
): number {
  for (const id of ids) {
    const n = nutrientes.find(
      (x) => x.nutrientId === id && x.unitName?.toUpperCase() === unidad,
    );
    if (n && typeof n.value === "number") return n.value;
  }
  return 0;
}

function mapearAlimento(alimento: UsdaAlimento): AlimentoUSDA {
  const n = alimento.foodNutrients ?? [];
  return {
    fdcId: alimento.fdcId,
    descripcion: alimento.description,
    descripcionEs: traducirDescripcionUSDA(alimento.description),
    categoria: alimento.foodCategory,
    caloriasPor100g: Math.round(obtenerValor(n, NUTRIENTE.energia, "KCAL")),
    proteinasPor100g: obtenerValor(n, NUTRIENTE.proteinas, "G"),
    carbohidratosPor100g: obtenerValor(n, NUTRIENTE.carbohidratos, "G"),
    grasasPor100g: obtenerValor(n, NUTRIENTE.grasas, "G"),
  };
}

/**
 * Prioriza alimentos enteros, frescos y básicos por encima de productos
 * procesados o alimentos para bebés que también coinciden con la palabra clave.
 */
function puntuarRelevancia(
  alimento: AlimentoUSDA,
  consultaEnIngles: string,
): number {
  const d = alimento.descripcion.toLowerCase();
  const q = consultaEnIngles.toLowerCase().trim();
  let puntos = 0;

  if (d.startsWith(q) || d.startsWith(`${q}s`)) {
    puntos += 60;
  } else if (d.includes(q)) {
    puntos += 20;
  }

  if (d.includes("raw") || d.includes("fresh")) {
    puntos += 25;
  }
  if (
    d.includes("with skin") ||
    d.includes("without skin") ||
    d.includes("whole")
  ) {
    puntos += 15;
  }

  if (d.includes("babyfood") && !q.includes("baby")) {
    puntos -= 50;
  }

  if (
    (d.includes("croissant") ||
      d.includes("strudel") ||
      d.includes("pie") ||
      d.includes("cake")) &&
    !q.includes("croissant") &&
    !q.includes("strudel")
  ) {
    puntos -= 30;
  }

  return puntos;
}

/**
 * Busca alimentos en USDA (la consulta debe ir en inglés) y descarta los
 * que no traen dato de energía, ordenándolos para que los alimentos principales
 * aparezcan primero.
 */
export async function buscarAlimentos(
  consultaEnIngles: string,
  signal?: AbortSignal,
): Promise<AlimentoUSDA[]> {
  const alimentos = await buscarAlimentosUsda(consultaEnIngles, {
    tamanoPagina: 25,
    signal,
  });
  return alimentos
    .map(mapearAlimento)
    .filter((a) => a.caloriasPor100g > 0)
    .sort(
      (a, b) =>
        puntuarRelevancia(b, consultaEnIngles) -
        puntuarRelevancia(a, consultaEnIngles),
    )
    .slice(0, 10);
}
