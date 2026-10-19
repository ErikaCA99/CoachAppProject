/**
 * Alimento genérico obtenido de USDA FoodData Central.
 * Todos los valores nutricionales están expresados por 100 g.
 * No se persiste tal cual: al registrarlo se convierte en un
 * `RegistroNutricional` con las cantidades ya calculadas para la porción.
 */
export interface AlimentoUSDA {
  fdcId: number;
  /** Descripción original de USDA (en inglés), p. ej. "Rice, white, cooked". */
  descripcion: string;
  /** Descripción traducida al español para visualización en la app. */
  descripcionEs?: string;
  categoria?: string;
  caloriasPor100g: number;
  proteinasPor100g: number;
  carbohidratosPor100g: number;
  grasasPor100g: number;
}
