/**
 * API pública de dominio de `features/progress`: entidades, reglas y esquemas.
 * Módulos puros (sin Firebase, red ni estado): cualquier capa o funcionalidad
 * puede importarlos. Casos de uso: `controller/`. Componentes: `view/`.
 */
export * from "./model/entities/PhysicalProgress";
export * from "./model/rules/progressReport";
export * from "./model/schemas/persisted.schema";
export * from "./model/schemas/progress.schema";
