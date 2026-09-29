import type { Href } from "expo-router";
import { create } from "zustand";

import type {
  NivelExperiencia,
  ObjetivoUsuario,
} from "@/models/entities/Usuario";

/**
 * Borrador del onboarding (no se persiste).
 *
 * - `objetivo` / `nivel`: lo que el usuario eligió en TargetSelectionScreen,
 *   para no pasarlo por parámetros de URL entre pantallas.
 * - `destinoPendiente`: a dónde ir apenas se desbloquee `(app)`. Hace falta
 *   porque al marcar `perfilCompleto = true` el `Stack.Protected` del layout
 *   raíz redirige a la ruta inicial de `(app)` (Inicio); desde ahí el Home
 *   consume este destino y navega (p. ej. a "Generar con IA").
 */
interface OnboardingState {
  objetivo: ObjetivoUsuario | null;
  nivel: NivelExperiencia | null;
  destinoPendiente: Href | null;

  setObjetivo: (objetivo: ObjetivoUsuario) => void;
  setNivel: (nivel: NivelExperiencia) => void;
  setDestinoPendiente: (destino: Href | null) => void;
  /** Devuelve el destino pendiente y lo limpia (lectura de un solo uso). */
  consumirDestino: () => Href | null;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  objetivo: null,
  nivel: null,
  destinoPendiente: null,

  setObjetivo: (objetivo) => set({ objetivo }),
  setNivel: (nivel) => set({ nivel }),
  setDestinoPendiente: (destinoPendiente) => set({ destinoPendiente }),
  consumirDestino: () => {
    const destino = get().destinoPendiente;
    if (destino) set({ destinoPendiente: null });
    return destino;
  },
  reset: () => set({ objetivo: null, nivel: null, destinoPendiente: null }),
}));
