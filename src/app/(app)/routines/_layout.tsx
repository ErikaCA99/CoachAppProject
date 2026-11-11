import { Stack } from "expo-router";
import { useReducirMovimiento } from "@/shared/hooks/useReducedMotion";

export default function RoutinesLayout() {
  const reducir = useReducirMovimiento();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducir ? "none" : "slide_from_right",
      }}
    />
  );
}
