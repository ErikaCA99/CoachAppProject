import { addDoc, collection } from "firebase/firestore";

import type { RegistroNutricional } from "@/models/entities/RegistroNutricional";
import { db } from "@/services/firebase/firebase";

const COLLECTION_NAME = "bmiRecords";

/**
 * Persiste un registro de IMC en Firestore.
 * Única capa que conoce el nombre de la colección y el SDK de Firebase.
 */
export async function guardarRegistroIMC(
  registro: RegistroNutricional
): Promise<void> {
  await addDoc(collection(db, COLLECTION_NAME), registro);
}
