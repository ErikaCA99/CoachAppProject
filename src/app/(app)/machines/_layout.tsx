import { Stack } from "expo-router";

/**
 * Stack de la Guía de Máquinas. Las tres pantallas dibujan su propio
 * encabezado (foto a pantalla completa en el detalle, fondo oscuro en el
 * escáner), así que el header nativo va oculto.
 */
export default function MachinesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="escaner"
        options={{ animation: "fade", presentation: "fullScreenModal" }}
      />
    </Stack>
  );
}
