import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
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
//
// React Native no soporta bien el streaming de WebChannel que el SDK web usa
// por defecto para los listeners (`onSnapshot`). En Android eso produce el
// aviso "WebChannelConnection RPC 'Listen' stream ... transport errored" y
// reconexiones constantes. Forzar long polling usa peticiones HTTP normales,
// que el `fetch` de React Native sí maneja de forma estable.
//
// Igual que con Auth: con Fast Refresh este módulo se re-ejecuta y
// `initializeFirestore` lanza si la instancia ya existe; en ese caso se
// recupera la existente con `getFirestore`.
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}
export { db };

// Inicializar Storage (imágenes y GIFs del catálogo de máquinas)
export const storage = getStorage(app);

export default app;
