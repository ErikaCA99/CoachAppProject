/**
 * API pública de dominio de `features/machines`: entidades, reglas y esquemas.
 * Módulos puros (sin Firebase, red ni estado): cualquier capa o funcionalidad
 * puede importarlos. Casos de uso: `controller/`. Componentes: `view/`.
 */
export * from "./model/entities/Machine";
export * from "./model/entities/machineAR.types";
export * from "./model/rules/machineExercise";
export * from "./model/rules/machineLabels";
export * from "./model/schemas/machine.schema";
export * from "./model/schemas/machineRecognition.schema";
