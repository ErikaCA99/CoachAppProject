import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";

import { auth } from "../services/firebase/firebase";
import { useAuthStore } from "../store/auth.store";

/**
 * Hook que encapsula el flujo completo de Google Sign-In → Firebase → Zustand.
 *
 * Flujo de signInWithGoogle:
 * 1. Verifica Play Services
 * 2. Abre el selector de cuentas de Google
 * 3. Obtiene el idToken de la respuesta
 * 4. Crea una credencial de Firebase con el idToken
 * 5. Autentica con Firebase (signInWithCredential)
 * 6. Valida los datos del usuario con Zod (dentro de setUser)
 * 7. Guarda en el store de Zustand
 */
export function useGoogleAuth() {
  const { setUser, setLoading, setError, logout } = useAuthStore();

  const signInWithGoogle = async (): Promise<void> => {
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

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      // setUser valida internamente con Zod antes de guardar
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      });
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
      await GoogleSignin.signOut();
      await signOut(auth);
    } finally {
      logout();
    }
  };

  return { signInWithGoogle, signOutFromGoogle };
}
