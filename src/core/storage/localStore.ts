import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Almacenamiento local no sensible (borradores, sesión de entrenamiento en
 * curso, caché de Zustand). Único módulo que importa AsyncStorage.
 *
 * No guarda credenciales: los tokens de Firebase los gestiona el SDK de Auth
 * (`core/firebase/firebase.ts`) y nunca se copian a Zustand ni aquí.
 */
export const localStore = {
  obtener: (clave: string): Promise<string | null> =>
    AsyncStorage.getItem(clave),
  guardar: (clave: string, valor: string): Promise<void> =>
    AsyncStorage.setItem(clave, valor),
  eliminar: (clave: string): Promise<void> => AsyncStorage.removeItem(clave),
};

/** Motor para `createJSONStorage` de los stores de Zustand persistidos. */
export const motorAlmacenamiento = AsyncStorage;
