import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// NOTA: Auth se importa de "@firebase/auth" (el paquete con scope), NO de
// "firebase/auth". El paquete "firebase" (el envoltorio) no declara la
// condición "react-native" en su exports map para "./auth" — ni en la
// versión instalada ni en la última publicada — así que siempre resuelve
// al build de navegador, que no incluye `getReactNativePersistence` y hace
// que Auth caiga a persistencia en memoria (la sesión no sobrevive un
// reinicio de la app) aunque `@react-native-async-storage/async-storage`
// esté instalado. "@firebase/auth" sí declara esa condición y ya es una
// dependencia real (transitiva de "firebase") presente en node_modules.
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "@firebase/auth";

// Configuración de Firebase (variables de entorno Expo)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inicializar Firebase (evita doble inicialización en HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Fast Refresh puede re-ejecutar este módulo con la misma `app`; si Auth
  // ya estaba inicializado, initializeAuth lanza "auth/already-initialized".
  // En ese caso recuperamos la instancia existente en vez de propagar el error.
  auth = getAuth(app);
}
export { auth };

// Inicializar Firestore
export const db = getFirestore(app);

export default app;
