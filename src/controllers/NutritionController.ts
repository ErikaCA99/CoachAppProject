import type { AlimentoUSDA } from "@/models/entities/USDAFood";
import type { RegistroNutricional } from "@/models/entities/NutritionRecord";
import { buscarAlimentos } from "@/models/repositories/foodRepository";
import {
  eliminarRegistroNutricion,
  guardarRegistroIMC,
  guardarRegistroIngesta,
  listarRegistrosNutricion,
  observarRegistrosNutricion,
} from "@/models/repositories/nutritionRepository";
import {
  registroIMCSchema,
  registroIngestaSchema,
} from "@/schemas/nutrition.schema";
import type { ConId } from "@/models/types";
import {
  calcularIMC,
  clasificarIMC,
  type BmiCategory,
} from "@/utils/bmiCalculator";
import {
  METAS_POR_DEFECTO,
  type MetasNutricionales,
} from "@/utils/nutritionGoals";
import { traducirConsulta } from "@/utils/foodTranslator";

export interface ResultadoIMC {
  bmi: number;
  category: BmiCategory;
}

export interface AlimentoRapido {
  id: string;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export const ALIMENTOS_RAPIDOS: readonly AlimentoRapido[] = [
  {
    id: "fruta",
    nombre: "Fruta",
    calorias: 80,
    proteinas: 1,
    carbohidratos: 20,
    grasas: 0,
  },
  {
    id: "pollo",
    nombre: "Pollo 100g",
    calorias: 165,
    proteinas: 31,
    carbohidratos: 0,
    grasas: 3.6,
  },
  {
    id: "arroz",
    nombre: "Arroz 100g",
    calorias: 130,
    proteinas: 2.7,
    carbohidratos: 28,
    grasas: 0.3,
  },
  {
    id: "huevo",
    nombre: "Huevo",
    calorias: 70,
    proteinas: 6,
    carbohidratos: 0.6,
    grasas: 5,
  },
  {
    id: "batido",
    nombre: "Batido",
    calorias: 150,
    proteinas: 25,
    carbohidratos: 5,
    grasas: 2,
  },
  {
    id: "ensalada",
    nombre: "Ensalada",
    calorias: 50,
    proteinas: 1.5,
    carbohidratos: 10,
    grasas: 0.5,
  },
  {
    id: "pan",
    nombre: "Pan",
    calorias: 80,
    proteinas: 3,
    carbohidratos: 15,
    grasas: 1,
  },
  {
    id: "leche",
    nombre: "Leche 200ml",
    calorias: 104,
    proteinas: 6.8,
    carbohidratos: 9.6,
    grasas: 4.4,
  },
] as const;

export interface PorcionCalculada {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

const redondear1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Escala los valores por 100 g de un alimento de USDA a la porción
 * consumida. Función pura: la usa la Vista para la vista previa y el
 * controlador al guardar, así ambos muestran exactamente el mismo número.
 */
export function calcularPorcion(
  alimento: AlimentoUSDA,
  gramos: number,
): PorcionCalculada {
  const factor = gramos > 0 ? gramos / 100 : 0;
  return {
    calorias: Math.round(alimento.caloriasPor100g * factor),
    proteinas: redondear1(alimento.proteinasPor100g * factor),
    carbohidratos: redondear1(alimento.carbohidratosPor100g * factor),
    grasas: redondear1(alimento.grasasPor100g * factor),
  };
}

// Las metas se calculan en `utils/metasNutricionales.ts` (Mifflin-St Jeor);
// se re-exportan aquí para que la Vista solo dependa del controlador.
export {
  calcularMetasNutricionales,
  METAS_POR_DEFECTO,
  type MetasNutricionales,
  type ResultadoMetas,
} from "@/utils/nutritionGoals";

export interface ResumenNutricionalDiario {
  caloriasConsumidas: number;
  metaCalorias: number;
  caloriasRestantes: number;
  porcentajeCalorias: number;
  proteinasConsumidas: number;
  metaProteinas: number;
  porcentajeProteinas: number;
  carbohidratosConsumidos: number;
  metaCarbohidratos: number;
  porcentajeCarbohidratos: number;
  grasasConsumidas: number;
  metaGrasas: number;
  porcentajeGrasas: number;
}

/** Verifica si un registro corresponde al día de hoy en hora local. */
export function esRegistroDeHoy(registro: RegistroNutricional): boolean {
  if (!registro.creadoEn) return true; // Creado localmente sin resolver timestamp del server aún
  const fecha = registro.creadoEn;
  const hoy = new Date();
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
}

/**
 * Filtra los registros que son de ingesta de alimentos correspondientes a hoy.
 */
export function filtrarAlimentosDeHoy(
  registros: ConId<RegistroNutricional>[],
): ConId<RegistroNutricional>[] {
  return registros.filter(
    (r) =>
      typeof r.alimento === "string" &&
      r.alimento.length > 0 &&
      esRegistroDeHoy(r),
  );
}

/**
 * Calcula el resumen total diario de calorías y macronutrientes.
 */
export function calcularResumenDiario(
  alimentosDeHoy: ConId<RegistroNutricional>[],
  metas: MetasNutricionales = METAS_POR_DEFECTO,
): ResumenNutricionalDiario {
  const totales = alimentosDeHoy.reduce(
    (acc, item) => ({
      calorias: acc.calorias + (item.calorias ?? 0),
      proteinas: acc.proteinas + (item.proteinas ?? 0),
      carbohidratos: acc.carbohidratos + (item.carbohidratos ?? 0),
      grasas: acc.grasas + (item.grasas ?? 0),
    }),
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
  );

  const caloriasRestantes = Math.max(0, metas.calorias - totales.calorias);
  const porcentajeCalorias = Math.min(
    1,
    metas.calorias > 0 ? totales.calorias / metas.calorias : 0,
  );
  const porcentajeProteinas = Math.min(
    1,
    metas.proteinas > 0 ? totales.proteinas / metas.proteinas : 0,
  );
  const porcentajeCarbohidratos = Math.min(
    1,
    metas.carbohidratos > 0 ? totales.carbohidratos / metas.carbohidratos : 0,
  );
  const porcentajeGrasas = Math.min(
    1,
    metas.grasas > 0 ? totales.grasas / metas.grasas : 0,
  );

  return {
    caloriasConsumidas: Math.round(totales.calorias),
    metaCalorias: metas.calorias,
    caloriasRestantes: Math.round(caloriasRestantes),
    porcentajeCalorias,
    proteinasConsumidas: Number(totales.proteinas.toFixed(1)),
    metaProteinas: metas.proteinas,
    porcentajeProteinas,
    carbohidratosConsumidos: Number(totales.carbohidratos.toFixed(1)),
    metaCarbohidratos: metas.carbohidratos,
    porcentajeCarbohidratos,
    grasasConsumidas: Number(totales.grasas.toFixed(1)),
    metaGrasas: metas.grasas,
    porcentajeGrasas,
  };
}

/**
 * Controlador (capa de negocio) para la funcionalidad de nutrición.
 * La Vista (`app/(app)/nutrition.tsx`) solo llama a este controlador;
 * nunca importa `utils/imcCalculator` ni el repositorio directamente.
 */
export const NutritionController = {
  /**
   * Calcula el IMC y lo persiste en el historial del usuario.
   * Si falla el guardado, el error se registra pero no interrumpe el
   * resultado mostrado al usuario (el cálculo en sí no depende de la red).
   */
  async calcularYGuardarIMC(
    usuarioId: string,
    pesoKg: number,
    alturaCm: number,
  ): Promise<ResultadoIMC> {
    const bmi = calcularIMC(pesoKg, alturaCm);
    const category = clasificarIMC(bmi);

    const datos = { weight: pesoKg, height: alturaCm, bmi, category };
    const validacion = registroIMCSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de IMC inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    try {
      await guardarRegistroIMC(usuarioId, validacion.data);
    } catch (error) {
      console.error("Error al guardar el registro de IMC:", error);
    }

    return { bmi, category };
  },

  /** Registra una ingesta alimentaria con validación. */
  async registrarIngesta(
    usuarioId: string,
    datos: {
      alimento: string;
      calorias: number;
      cantidad?: string;
      proteinas?: number;
      carbohidratos?: number;
      grasas?: number;
      fdcId?: number;
    },
  ): Promise<void> {
    const validacion = registroIngestaSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de ingesta inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    await guardarRegistroIngesta(usuarioId, validacion.data);
  },

  /**
   * Busca alimentos en USDA FoodData Central a partir de texto en español
   * (se traduce antes de consultar, porque la base de USDA está en inglés).
   */
  async buscarAlimentos(
    texto: string,
    signal?: AbortSignal,
  ): Promise<AlimentoUSDA[]> {
    const { consulta } = traducirConsulta(texto);
    if (consulta.length < 2) return [];
    return buscarAlimentos(consulta, signal);
  },

  /**
   * Registra un alimento de USDA: calcula calorías y macros para los gramos
   * consumidos y lo guarda como ingesta del día.
   */
  async registrarAlimentoUSDA(
    usuarioId: string,
    alimento: AlimentoUSDA,
    gramos: number,
    nombre?: string,
  ): Promise<void> {
    if (!(gramos > 0) || gramos > 5_000) {
      throw new Error("Ingresa una cantidad válida en gramos (1 a 5000).");
    }
    const porcion = calcularPorcion(alimento, gramos);
    await NutritionController.registrarIngesta(usuarioId, {
      alimento:
        nombre?.trim() || alimento.descripcionEs || alimento.descripcion,
      cantidad: `${gramos} g`,
      fdcId: alimento.fdcId,
      ...porcion,
    });
  },

  /** Lista el historial nutricional completo del usuario. */
  async listar(usuarioId: string): Promise<ConId<RegistroNutricional>[]> {
    return listarRegistrosNutricion(usuarioId);
  },

  /** Elimina un registro nutricional por ID. */
  async eliminar(usuarioId: string, registroId: string): Promise<void> {
    return eliminarRegistroNutricion(usuarioId, registroId);
  },

  /** Suscripción en tiempo real al historial nutricional. */
  observar: observarRegistrosNutricion,
};
