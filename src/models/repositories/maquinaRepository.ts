import type { Maquina } from "@/models/entities/Maquina";
import { maquinaSchema } from "@/schemas/maquina.schema";
import { listar, obtenerPorId } from "@/services/firebase/firestoreService";
import { obtenerUrlDescarga } from "@/services/firebase/storageService";

/**
 * Repositorio del catálogo `maquinas/` (Firestore, solo lectura).
 *
 * Son pocas máquinas (unas 35, ~150 KB), así que se descarga el catálogo
 * completo una vez por sesión y se filtra en memoria. Firestore además
 * guarda su propia caché offline.
 */

const COLECCION = "maquinas";

let catalogoEnMemoria: Promise<Maquina[]> | null = null;

function validar(documento: unknown): Maquina | null {
  const resultado = maquinaSchema.safeParse(documento);
  if (!resultado.success) {
    console.warn(
      "Documento de máquina inválido, se omite:",
      (documento as { id?: string })?.id,
      resultado.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    return null;
  }
  return resultado.data;
}

async function descargarCatalogo(): Promise<Maquina[]> {
  const documentos = await listar<Omit<Maquina, "id">>(COLECCION);
  return documentos
    .map(validar)
    .filter((m): m is Maquina => m !== null)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

/** Todo el catálogo, ordenado por categoría y nombre (cacheado en memoria). */
export function listarMaquinas(
  opciones: { forzar?: boolean } = {},
): Promise<Maquina[]> {
  if (!catalogoEnMemoria || opciones.forzar) {
    catalogoEnMemoria = descargarCatalogo().catch((error) => {
      catalogoEnMemoria = null; // permitir reintentar
      throw error;
    });
  }
  return catalogoEnMemoria;
}

export async function obtenerMaquina(id: string): Promise<Maquina | null> {
  if (catalogoEnMemoria) {
    const enCache = (await catalogoEnMemoria).find((m) => m.id === id);
    if (enCache) return enCache;
  }
  const documento = await obtenerPorId<Omit<Maquina, "id">>(COLECCION, id);
  return documento ? validar(documento) : null;
}

/** URL de descarga de una ruta de Storage (`maquinas/...`, `ejercicios/...`). */
export function obtenerUrlArchivo(ruta: string): Promise<string> {
  return obtenerUrlDescarga(ruta);
}
