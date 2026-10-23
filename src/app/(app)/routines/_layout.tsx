import { Stack } from "expo-router";
import { useReducirMovimiento } from "@/hooks/useReducedMotion";

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
