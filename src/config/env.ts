import {
  mensajeVariablesFaltantes,
  variablesFaltantes,
} from "@/utils/environment";

/**
 * Única puerta de entrada a las variables de entorno de la app.
 *
 * IMPORTANTE: Expo solo incrusta `process.env.EXPO_PUBLIC_*` cuando se accede
 * con el nombre literal (acceso estático). No lo cambies por un acceso
 * dinámico (`process.env[nombre]`): en el bundle quedaría `undefined`.
 *
 * Si falta alguna variable de Firebase se lanza un error con el nombre de cada
 * una. Antes, un build sin `.env` (p. ej. EAS Build, donde `.env` no se sube)
 * fallaba con `auth/invalid-api-key` y la app se cerraba al abrir.
 */
const fuente = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

/** Sin estas, la app no puede iniciar (Firebase falla al importarse). */
const REQUERIDAS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const;

const faltantes = variablesFaltantes(fuente, REQUERIDAS);
if (faltantes.length > 0) {
  throw new Error(mensajeVariablesFaltantes(faltantes));
}

export const env = {
  firebase: {
    apiKey: fuente.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: fuente.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: fuente.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: fuente.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: fuente.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: fuente.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: fuente.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  /** Opcional: sin él solo falla el inicio de sesión con Google. */
  googleWebClientId: fuente.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
} as const;
