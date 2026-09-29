import type { Persistence, ReactNativeAsyncStorage } from "@firebase/auth";

/**
 * `@firebase/auth` sí implementa `getReactNativePersistence` en su build de
 * React Native (`dist/rn/index.js`, resuelto en runtime por Metro vía la
 * condición "react-native" de su exports map — confirmado leyendo
 * node_modules directamente). Pero ese exports map declara un `"types"`
 * genérico (`dist/auth-public.d.ts`) ANTES de la rama `"react-native"`, así
 * que TypeScript siempre tipa contra el build multiplataforma, que no
 * re-exporta esa función (sí expone `Persistence`/`ReactNativeAsyncStorage`,
 * los tipos que usa, solo no la función en sí).
 *
 * Esta ampliación de módulo solo agrega la firma que falta para que
 * `tsc --noEmit` compile; no cambia nada en tiempo de ejecución.
 */
declare module "@firebase/auth" {
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage,
  ): Persistence;
}
