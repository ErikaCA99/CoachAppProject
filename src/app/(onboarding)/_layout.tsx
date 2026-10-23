import { Stack } from "expo-router";
import { useReducirMovimiento } from "@/hooks/useReducedMotion";

export const unstable_settings = {
  initialRouteName: "goal",
};

/**
 * Onboarding posterior al registro/primer login. Solo es accesible cuando hay
 * sesión y `perfilCompleto === false` (ver `Stack.Protected` en el layout raíz).
 *
 * 1. goal.tsx      → objetivo + nivel de experiencia
 * 2. physical-data.tsx → edad, altura, peso y días disponibles
 * 3. routine.tsx        → generar con IA / crear personalizada / saltar
 */
export default function OnboardingLayout() {
  const reducir = useReducirMovimiento();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducir ? "none" : "slide_from_right",
      }}
    >
      <Stack.Screen name="goal" />
      <Stack.Screen name="physical-data" />
      <Stack.Screen name="routine" />
    </Stack>
  );
}
