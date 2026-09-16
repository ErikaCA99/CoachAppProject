import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type User, userSchema } from "../schemas/auth.schema";

interface AuthState {
  /** Usuario autenticado (null si no hay sesión) */
  user: User | null;
  /** Indica si hay una operación de auth en curso */
  isLoading: boolean;
  /** Mensaje de error de la última operación de auth */
  error: string | null;
  /** True una vez que Zustand terminó de leer AsyncStorage */
  hasHydrated: boolean;

  /** Valida con Zod y guarda el usuario en el store */
  setUser: (rawUser: unknown) => void;
  /** Limpia la sesión */
  logout: () => void;
  /** Actualiza el estado de carga */
  setLoading: (loading: boolean) => void;
  /** Establece un mensaje de error */
  setError: (error: string | null) => void;
  /** Marca que la rehidratación terminó */
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,
      hasHydrated: false,

      setUser: (rawUser: unknown) => {
        const result = userSchema.safeParse(rawUser);
        if (!result.success) {
          console.warn("Usuario inválido:", result.error.flatten());
          set({ error: "Datos de usuario inválidos", user: null });
          return;
        }
        set({ user: result.data, error: null });
      },

      logout: () => set({ user: null, error: null }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      setError: (error: string | null) => set({ error }),

      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persiste el usuario; isLoading, error y hasHydrated son efímeros
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
