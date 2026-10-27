import {
  nutricionPersistidaSchema,
  validarDocumento,
} from "@/schemas/persisted.schema";
import type { OpcionesConsulta } from "@/services/firebase/firestoreService";
import type { RegistroNutricional } from "@/models/entities/NutritionRecord";
import type { ConId } from "@/models/types";
import {
  crear,
  eliminar,
  listar,
  observarPorUsuario,
} from "@/services/firebase/firestoreService";

const validar = validarDocumento(nutricionPersistidaSchema);

/** Única función que conoce la ruta real de la subcolección de nutrición. */
function coleccion(usuarioId: string): string {
  return `usuarios/${usuarioId}/registrosNutricionales`;
}

/**
 * Persiste un registro de IMC en `usuarios/{usuarioId}/registrosNutricionales`.
 */
export async function guardarRegistroIMC(
  usuarioId: string,
  registro: Omit<RegistroNutricional, "usuarioId" | "creadoEn">,
): Promise<void> {
  await crear(coleccion(usuarioId), { ...registro, usuarioId });
}

/**
 * Persiste un registro de ingesta alimentaria.
 */
export async function guardarRegistroIngesta(
  usuarioId: string,
  registro: Omit<RegistroNutricional, "usuarioId" | "creadoEn">,
): Promise<void> {
  await crear(coleccion(usuarioId), { ...registro, usuarioId });
}

/** Lista el historial nutricional del usuario, más reciente primero. */
export async function listarRegistrosNutricion(
  usuarioId: string,
  intervalo: Pick<OpcionesConsulta, "desde" | "hasta"> = {},
): Promise<ConId<RegistroNutricional>[]> {
  return listar<RegistroNutricional>(coleccion(usuarioId), {
    ...intervalo,
    validar,
    ordenarPor: "creadoEn",
    direccion: "desc",
  });
}

/** Elimina un registro nutricional por ID. */
export async function eliminarRegistroNutricion(
  usuarioId: string,
  registroId: string,
): Promise<void> {
  return eliminar(coleccion(usuarioId), registroId);
}

/** Suscripción en tiempo real al historial nutricional del usuario. */
export function observarRegistrosNutricion(
  usuarioId: string,
  callback: (registros: ConId<RegistroNutricional>[]) => void,
  onError?: (error: Error) => void,
) {
  return observarPorUsuario<RegistroNutricional>(
    usuarioId,
    "registrosNutricionales",
    callback,
    {
      validar,
      ordenarPor: "creadoEn",
      direccion: "desc",
      onError,
    },
  );
}
