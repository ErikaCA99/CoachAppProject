import "../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { configureGoogleSignIn } from "@/config/googleSignIn";
import { useAuthListener } from "@/hooks/useAuthListener";
import { usePerfilListener } from "@/hooks/usePerfilListener";
import { useAuthStore } from "@/store/auth.store";

// Mantener el splash nativo hasta saber a qué grupo de rutas ir.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Enrutador raíz — protección de rutas basada en estado con `Stack.Protected`
 * (API nativa de Expo Router desde SDK 53).
 *
 *  ┌──────────────────────┬──────────────────────────────────────────┐
 *  │ Estado               │ Grupo disponible                         │
 *  ├──────────────────────┼──────────────────────────────────────────┤
 *  │ sin sesión           │ index (bienvenida) + (auth)              │
 *  │ sesión, perfil ?     │ (auth) — se espera a Firestore           │
 *  │ sesión, perfil false │ (onboarding)                             │
 *  │ sesión, perfil true  │ (app)                                    │
 *  └──────────────────────┴──────────────────────────────────────────┘
 *
 * Cuando un guard cambia, Expo Router saca al usuario de las pantallas que
 * dejaron de estar disponibles y lo lleva a la primera disponible. Por eso
 * ninguna pantalla hace `router.replace` tras login/registro/onboarding:
 * basta con que cambie el estado del store.
 */
export default function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const perfilCompleto = useAuthStore((s) => s.perfilCompleto);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const authInicializado = useAuthStore((s) => s.authInicializado);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  // Firebase Auth → Zustand (user)
  useAuthListener();
  // Firestore usuarios/{uid} → Zustand (perfilCompleto)
  usePerfilListener();

  const haySesion = !!user;
  const listo =
    hasHydrated && authInicializado && (!haySesion || perfilCompleto !== null);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      {/* Público: bienvenida y login/registro. Sigue disponible mientras se
          carga el perfil tras iniciar sesión, para no mostrar una pantalla
          vacía entre el login y el onboarding/home. */}
      <Stack.Protected guard={!haySesion || perfilCompleto === null}>
        <Stack.Protected guard={!haySesion}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={haySesion && perfilCompleto === false}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={haySesion && perfilCompleto === true}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
