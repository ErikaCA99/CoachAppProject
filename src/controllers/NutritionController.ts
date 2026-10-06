import type { RegistroNutricional } from "@/models/entities/RegistroNutricional";
import {
  eliminarRegistroNutricion,
  guardarRegistroIMC,
  guardarRegistroIngesta,
  listarRegistrosNutricion,
  observarRegistrosNutricion,
} from "@/models/repositories/nutricionRepository";
import {
  registroIMCSchema,
  registroIngestaSchema,
} from "@/schemas/nutricion.schema";
import type { ConId } from "@/services/firebase/firestoreService";
import {
  calcularIMC,
  clasificarIMC,
  type BmiCategory,
} from "@/utils/imcCalculator";

export interface ResultadoIMC {
  bmi: number;
  category: BmiCategory;
}

/**
 * Controlador (capa de negocio) para la funcionalidad de nutrición.
 * La Vista (`app/(app)/nutricion.tsx`) solo llama a este controlador;
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
    datos: { alimento: string; calorias: number; cantidad?: string },
  ): Promise<void> {
    const validacion = registroIngestaSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de ingesta inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    await guardarRegistroIngesta(usuarioId, validacion.data);
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
