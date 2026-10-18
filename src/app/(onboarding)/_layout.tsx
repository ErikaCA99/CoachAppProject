import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "objetivo",
};

/**
 * Onboarding posterior al registro/primer login. Solo es accesible cuando hay
 * sesión y `perfilCompleto === false` (ver `Stack.Protected` en el layout raíz).
 *
 * 1. objetivo.tsx      → objetivo + nivel de experiencia
 * 2. physical-data.tsx → edad, altura, peso y días disponibles
 * 3. rutina.tsx        → generar con IA / crear personalizada / saltar
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="goal" />
      <Stack.Screen name="physical-data" />
      <Stack.Screen name="routine" />
    </Stack>
  );
}
