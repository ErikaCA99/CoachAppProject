/**
 * API pública de dominio de `features/workout`: entidades, reglas y esquemas.
 * Módulos puros (sin Firebase, red ni estado): cualquier capa o funcionalidad
 * puede importarlos. Casos de uso: `controller/`. Componentes: `view/`.
 */
export * from "./model/entities/Workout";
export * from "./model/rules/workoutSession";
export * from "./model/rules/workoutStats";
export * from "./model/schemas/persisted.schema";
export * from "./model/schemas/workout.schema";
