import type { BmiCategory } from "@/utils/imcCalculator";

/**
 * Registro histórico de una medición de IMC de un usuario.
 * Corresponde a un documento de `usuarios/{usuarioId}/registrosNutricionales`.
 * `creadoEn` lo inyecta `firestoreService` con `serverTimestamp()`; nunca se
 * construye en el cliente.
 */
export interface RegistroNutricional {
  usuarioId: string;

  // ── Campos de cálculo IMC ──────────────────────────────────────────
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  category?: BmiCategory;

  // ── Campos de ingesta alimentaria ──────────────────────────────────
  alimento?: string;
  calorias?: number;
  cantidad?: string; // p.ej. "200 g", "1 taza"
  proteinas?: number; // gramos
  carbohidratos?: number; // gramos
  grasas?: number; // gramos
  /** ID del alimento en USDA FoodData Central (si vino de la API). */
  fdcId?: number;

  creadoEn?: Date;
}
