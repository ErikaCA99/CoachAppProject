import type { Href } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { NivelExperiencia, ObjetivoUsuario } from "@/models/entities/User";
import type { DatosFisicosInput } from "@/schemas/user.schema";

/**
 * Borrador del onboarding. Se persiste en AsyncStorage (solo objetivo, nivel y
 * datos físicos) para no perderlo si la app se cierra a mitad del proceso; se
 * limpia al terminar el onboarding y al cerrar sesión.
 *
 * - `objetivo` / `nivel`: lo que el usuario eligió en TargetSelectionScreen,
 *   para no pasarlo por parámetros de URL entre pantallas.
 * - `datosFisicos`: edad, altura, peso y días disponibles de
 *   PhysicalDataScreen (ya validados con `datosFisicosSchema`).
 * - `destinoPendiente`: a dónde ir apenas se desbloquee `(app)`. Hace falta
 *   porque al marcar `perfilCompleto = true` el `Stack.Protected` del layout
 *   raíz redirige a la ruta inicial de `(app)` (Inicio); desde ahí el Home
 *   consume este destino y navega (p. ej. a "Generar con IA").
 */
interface OnboardingState {
  objetivo: ObjetivoUsuario | null;
  nivel: NivelExperiencia | null;
  datosFisicos: DatosFisicosInput | null;
  destinoPendiente: Href | null;

  setObjetivo: (objetivo: ObjetivoUsuario) => void;
  setNivel: (nivel: NivelExperiencia) => void;
  setDatosFisicos: (datos: DatosFisicosInput) => void;
  setDestinoPendiente: (destino: Href | null) => void;
  /** Limpia el destino pendiente una vez que la pantalla destino ya abrió. */
  limpiarDestinoPendiente: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      objetivo: null,
      nivel: null,
      datosFisicos: null,
      destinoPendiente: null,

      setObjetivo: (objetivo) => set({ objetivo }),
      setNivel: (nivel) => set({ nivel }),
      setDatosFisicos: (datosFisicos) => set({ datosFisicos }),
      setDestinoPendiente: (destinoPendiente) => set({ destinoPendiente }),
      limpiarDestinoPendiente: () => set({ destinoPendiente: null }),
      reset: () =>
        set({
          objetivo: null,
          nivel: null,
          datosFisicos: null,
          destinoPendiente: null,
        }),
    }),
    {
      name: "onboarding-draft",
      storage: createJSONStorage(() => AsyncStorage),
      // destinoPendiente es efímero: solo vive entre el último paso y el Home.
      partialize: (state) => ({
        objetivo: state.objetivo,
        nivel: state.nivel,
        datosFisicos: state.datosFisicos,
      }),
    },
  ),
);
