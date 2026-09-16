import { calcularIMC, clasificarIMC, type BmiCategory } from "@/utils/imcCalculator";
import type { RegistroNutricional } from "@/models/entities/RegistroNutricional";
import { guardarRegistroIMC } from "@/models/repositories/nutricionRepository";

export interface ResultadoIMC {
  bmi: number;
  category: BmiCategory;
}

/**
 * Controlador (capa de negocio) para la funcionalidad de nutrición/IMC.
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
    pesoKg: number,
    alturaCm: number
  ): Promise<ResultadoIMC> {
    const bmi = calcularIMC(pesoKg, alturaCm);
    const category = clasificarIMC(bmi);

    const registro: RegistroNutricional = {
      weight: pesoKg,
      height: alturaCm,
      bmi,
      category,
      timestamp: new Date(),
    };

    try {
      await guardarRegistroIMC(registro);
    } catch (error) {
      console.error("Error al guardar el registro de IMC:", error);
    }

    return { bmi, category };
  },
};
