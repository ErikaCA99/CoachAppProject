import { NativeModules } from "react-native";

import { AuthController } from "@/controllers/AuthController";
import { useAuthStore } from "@/store/auth.store";

/**
 * True si el módulo nativo de Google Sign-In está registrado en el binario.
 * En Expo Go será false — se necesita un Development Build.
 */
const NATIVE_MODULE_AVAILABLE = !!NativeModules.RNGoogleSignin;

/**
 * Carga el módulo de Google Sign-In de forma segura.
 * Solo lo carga si el módulo nativo está disponible.
 *
 * La configuración (webClientId desde EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) se
 * hace UNA vez en `config/googleSignIn.ts`, al montar el layout raíz. Aquí
 * no se vuelve a llamar a `configure` para no pisar ese valor.
 */
function getGoogleSignin() {
  if (!NATIVE_MODULE_AVAILABLE) return null;
  const googleModule =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");

  return googleModule;
}

/**
 * Hook que encapsula el flujo completo de Google Sign-In → Firebase → Zustand.
 *
 * Flujo de signInWithGoogle:
 * 1. Verifica Play Services
 * 2. Abre el selector de cuentas de Google
 * 3. Obtiene el idToken de la respuesta
 * 4. Autentica en Firebase y crea el perfil si es el primer acceso
 *    (AuthController.iniciarSesionConGoogle)
 * 5. Valida los datos del usuario con Zod (dentro de setUser)
 * 6. Guarda en el store de Zustand
 *
 * NOTA: Requiere Development Build (expo run:android / expo run:ios).
 * En Expo Go mostrará un error al intentar iniciar sesión con Google.
 */
export function useGoogleAuth() {
  const { setUser, setLoading, setError, logout } = useAuthStore();

  const signInWithGoogle = async (): Promise<void> => {
    const googleModule = getGoogleSignin();
    if (!googleModule) {
      setError(
        "Google Sign-In no disponible en Expo Go. Usa un Development Build.",
      );
      return;
    }

    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
      googleModule;

    setLoading(true);
    setError(null);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // El usuario canceló el selector de cuentas
        return;
      }

      const { idToken } = response.data;
      if (!idToken) {
        throw new Error("No se recibió idToken de Google");
      }

      // Firebase + perfil en Firestore (primer login) los resuelve el controlador.
      const usuario = await AuthController.iniciarSesionConGoogle(idToken);
      setUser(usuario); // setUser valida con Zod antes de guardar
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // No mostrar error si el usuario canceló
            break;
          case statusCodes.IN_PROGRESS:
            setError("Ya hay un inicio de sesión en curso");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError("Google Play Services no está disponible");
            break;
          default:
            setError("No se pudo iniciar sesión con Google");
        }
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutFromGoogle = async (): Promise<void> => {
    try {
      const googleModule = getGoogleSignin();
      if (googleModule) {
        await googleModule.GoogleSignin.signOut();
      }
      await AuthController.cerrarSesion();
    } finally {
      logout();
    }
  };

  return { signInWithGoogle, signOutFromGoogle };
}
