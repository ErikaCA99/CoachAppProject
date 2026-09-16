import { GoogleSignin } from "@react-native-google-signin/google-signin";

/**
 * Configura Google Sign-In con el Web Client ID de Firebase.
 * Llamar una sola vez al montar el layout raíz.
 */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ["profile", "email"],
  });
}
