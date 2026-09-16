import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";

import { configureGoogleSignIn } from "../config/googleSignIn";
import { useAuthListener } from "../hooks/useAuthListener";

export default function RootLayout() {
  // Configurar Google Sign-In una sola vez al montar
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  // Sincronizar Firebase Auth → Zustand
  useAuthListener();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
