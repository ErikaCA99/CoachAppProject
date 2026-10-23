import { Stack } from "expo-router";
import { useReducirMovimiento } from "@/hooks/useReducedMotion";

/**
 * Stack de la Guía de Máquinas. Las tres pantallas dibujan su propio
 * encabezado (foto a pantalla completa en el detalle, fondo oscuro en el
 * escáner), así que el header nativo va oculto.
 */
export default function MachinesLayout() {
  const reducir = useReducirMovimiento();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducir ? "none" : "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="scanner"
        options={{
          animation: reducir ? "none" : "fade",
          presentation: "fullScreenModal",
        }}
      />
    </Stack>
  );
}
