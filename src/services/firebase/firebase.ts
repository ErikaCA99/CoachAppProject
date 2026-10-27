import { configurarAppCheck } from "@/services/firebase/appCheck";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "@firebase/app";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "@firebase/firestore";
import { getStorage } from "@firebase/storage";
// Todos los servicios usan módulos @firebase/* directamente. Evita cargar
// una copia anidada de @firebase/app desde el wrapper "firebase", distinta
// de la que registra Auth y que causa "Component auth has not been registered yet".
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "@firebase/auth";

import { env } from "@/config/env";

// Configuración de Firebase: viene de `src/config/env.ts`, que valida que las
// variables existan (si faltan, lanza un error que las nombra).
const firebaseConfig = env.firebase;

// Inicializar Firebase (evita doble inicialización en HMR)
const existente = getApps().length > 0;
const app = existente ? getApp() : initializeApp(firebaseConfig);
if (!existente) configurarAppCheck(app);

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
