import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "TargetSelectionScreen",
};

/**
 * Onboarding posterior al registro/primer login. Solo es accesible cuando hay
 * sesión y `perfilCompleto === false` (ver `Stack.Protected` en el layout raíz).
 *
 * 1. TargetSelectionScreen → objetivo + nivel de experiencia
 * 2. RoutineChoiceScreen   → generar con IA / crear personalizada / saltar
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="TargetSelectionScreen" />
      <Stack.Screen name="RoutineChoiceScreen" />
    </Stack>
  );
}
