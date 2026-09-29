import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "LoginScreen",
};

/**
 * Login y Registro comparten cabecera y pestañas; el cambio entre ambos se
 * hace con `router.replace`, así que sin animación parece un solo formulario.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="LoginScreen" />
      <Stack.Screen name="RegisterScreen" />
    </Stack>
  );
}
