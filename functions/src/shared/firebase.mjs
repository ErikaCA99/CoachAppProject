import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Una sola inicialización del SDK Admin para todas las funciones.
initializeApp();
export const db = getFirestore();
