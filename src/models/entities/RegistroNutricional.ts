import type { BmiCategory } from "@/utils/imcCalculator";

/**
 * Registro histórico de una medición de IMC de un usuario.
 * Corresponde a un documento de la colección `bmiRecords` en Firestore.
 */
export interface RegistroNutricional {
  weight: number; // kg
  height: number; // cm
  bmi: number;
  category: BmiCategory;
  timestamp: Date;
}
