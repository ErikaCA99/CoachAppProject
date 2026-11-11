/**
 * API pública de dominio de `features/nutrition`: entidades, reglas y esquemas.
 * Módulos puros (sin Firebase, red ni estado): cualquier capa o funcionalidad
 * puede importarlos. Casos de uso: `controller/`. Componentes: `view/`.
 */
export * from "./model/entities/NutritionRecord";
export * from "./model/entities/USDAFood";
export * from "./model/rules/bmiCalculator";
export * from "./model/rules/foodTranslator";
export * from "./model/rules/nutritionGoals";
export * from "./model/schemas/nutrition.schema";
export * from "./model/schemas/persisted.schema";
