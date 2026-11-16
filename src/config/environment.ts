/**
 * Validación pura de variables de entorno. Sin dependencias de React Native
 * ni de Expo para poder probarla con Jest. La lectura real de
 * `process.env` vive en `src/config/env.ts`.
 */

type FuenteEntorno = Readonly<Record<string, string | undefined>>;

/** Devuelve los nombres de `requeridas` que no tienen valor (vacío cuenta como faltante). */
export function variablesFaltantes(
  fuente: FuenteEntorno,
  requeridas: readonly string[],
): string[] {
  return requeridas.filter((nombre) => !fuente[nombre]?.trim());
}

/** Mensaje de error que nombra cada variable faltante y cómo corregirlo. */
export function mensajeVariablesFaltantes(
  faltantes: readonly string[],
): string {
  return [
    `Configuración incompleta: faltan ${faltantes.length} variable(s) de entorno en este build:`,
    ...faltantes.map((nombre) => `  - ${nombre}`),
    "Las variables EXPO_PUBLIC_* se incrustan en el bundle al compilar.",
    "En local: revisa .env y reinicia con `npx expo start -c`.",
    "En EAS: `eas env:push --path .env --environment preview` y vuelve a compilar.",
  ].join("\n");
}
