import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type User, userSchema } from "../schemas/auth.schema";

interface AuthState {
  /** Usuario autenticado (null si no hay sesión) */
  user: User | null;
  /**
   * Si el perfil de Firestore ya tiene objetivo + nivel (onboarding hecho).
   * - `null`  → todavía no se sabe (perfil cargando o sin sesión)
   * - `false` → hay que pasar por `(onboarding)`
   * - `true`  → puede entrar a `(app)`
   * Lo mantiene `usePerfilListener` a partir del documento `usuarios/{uid}`.
   */
  perfilCompleto: boolean | null;
  /** Indica si hay una operación de auth en curso */
  isLoading: boolean;
  /** Mensaje de error de la última operación de auth */
  error: string | null;
  /** True una vez que Zustand terminó de leer AsyncStorage */
  hasHydrated: boolean;
  /** True cuando Firebase Auth emitió su primer `onAuthStateChanged` */
  authInicializado: boolean;

  /** Valida con Zod y guarda el usuario en el store */
  setUser: (rawUser: unknown) => void;
  /** Marca si el perfil completó el onboarding */
  setPerfilCompleto: (completo: boolean | null) => void;
  /** Limpia la sesión */
  logout: () => void;
  /** Actualiza el estado de carga */
  setLoading: (loading: boolean) => void;
  /** Establece un mensaje de error */
  setError: (error: string | null) => void;
  /** Marca que la rehidratación terminó */
  setHasHydrated: (value: boolean) => void;
  /** Marca que Firebase Auth ya respondió al menos una vez */
  setAuthInicializado: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      perfilCompleto: null,
      isLoading: false,
      error: null,
      hasHydrated: false,
      authInicializado: false,

      setUser: (rawUser: unknown) => {
        const result = userSchema.safeParse(rawUser);
        if (!result.success) {
          console.warn("Usuario inválido:", result.error.flatten());
          set({ error: "Datos de usuario inválidos", user: null });
          return;
        }
        set({ user: result.data, error: null });
      },

      setPerfilCompleto: (perfilCompleto: boolean | null) =>
        set({ perfilCompleto }),

      logout: () => set({ user: null, error: null, perfilCompleto: null }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      setError: (error: string | null) => set({ error }),

      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),

      setAuthInicializado: (value: boolean) => set({ authInicializado: value }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Persiste usuario + perfilCompleto para que, al reabrir la app, el
      // enrutador sepa a qué grupo ir sin esperar a Firestore (sin parpadeo).
      // isLoading, error, hasHydrated y authInicializado son efímeros.
      partialize: (state) => ({
        user: state.user,
        perfilCompleto: state.perfilCompleto,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
