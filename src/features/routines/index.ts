/**
 * API pública de dominio de `features/routines`: entidades, reglas y esquemas.
 * Módulos puros (sin Firebase, red ni estado): cualquier capa o funcionalidad
 * puede importarlos. Casos de uso: `controller/`. Componentes: `view/`.
 */
export * from "./model/entities/Routine";
export * from "./model/rules/routineEditor";
export * from "./model/rules/routineGenerator";
export * from "./model/schemas/persisted.schema";
export * from "./model/schemas/routine.schema";
