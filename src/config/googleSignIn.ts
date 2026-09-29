import { NativeModules } from "react-native";

/**
 * True si el módulo nativo de Google Sign-In está registrado en el binario.
 * En Expo Go será false — se necesita un Development Build.
 */
const NATIVE_MODULE_AVAILABLE = !!NativeModules.RNGoogleSignin;

/**
 * Configura Google Sign-In con el Web Client ID de Firebase.
 * Llamar una sola vez al montar el layout raíz.
 *
 * NOTA: Requiere Development Build (expo run:android / expo run:ios).
 * En Expo Go la configuración se omite en silencio.
 */
export function configureGoogleSignIn(): void {
  if (!NATIVE_MODULE_AVAILABLE) {
    console.warn(
      "[GoogleSignIn] Módulo nativo no disponible. Usa `expo run:android` para habilitar Google Sign-In.",
    );
    return;
  }

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { GoogleSignin } =
    require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
  /* eslint-enable @typescript-eslint/no-require-imports */
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ["profile", "email"],
  });
}
