import { getDownloadURL, ref } from "firebase/storage";

import { storage } from "@/services/firebase/firebase";

/**
 * Helpers de Firebase Storage. Este es el ÚNICO archivo del proyecto que
 * debe importar el SDK de Storage (mismo criterio que `firestoreService`).
 *
 * Firestore guarda RUTAS (`maquinas/x/principal.webp`), no URLs con token:
 * aquí se convierten a URL de descarga. Se cachea la promesa por ruta para
 * no repetir la petición cada vez que una tarjeta se vuelve a montar.
 */

const cacheUrls = new Map<string, Promise<string>>();

export function obtenerUrlDescarga(rutaArchivo: string): Promise<string> {
  const enCache = cacheUrls.get(rutaArchivo);
  if (enCache) return enCache;

  const promesa = getDownloadURL(ref(storage, rutaArchivo)).catch((error) => {
    // No dejar un fallo cacheado: el siguiente intento vuelve a pedirla.
    cacheUrls.delete(rutaArchivo);
    throw error;
  });
  cacheUrls.set(rutaArchivo, promesa);
  return promesa;
}
