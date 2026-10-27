import {
  rutinaPersistidaSchema,
  validarDocumento,
} from "@/schemas/persisted.schema";
import { z } from "zod";
import { invocarFuncion } from "@/services/firebase/functionsService";
import type { Rutina } from "@/models/entities/Routine";
import type { ConId } from "@/models/types";
import {
  eliminar,
  listar,
  obtenerPorId,
  observarPorUsuario,
} from "@/services/firebase/firestoreService";

const validar = validarDocumento(rutinaPersistidaSchema);

/** Única función que conoce la ruta real de la subcolección de rutinas. */
function coleccion(usuarioId: string): string {
  return `usuarios/${usuarioId}/rutinas`;
}

export async function guardarRutina(
  usuarioId: string,
  rutina: Omit<Rutina, "creadoEn">,
): Promise<string> {
  if (rutina.usuarioId !== usuarioId)
    throw new Error("Usuario de rutina inválido.");
  const { usuarioId: _uid, ...datos } = rutina;
  const resultado = await invocarFuncion(
    "guardarRutina",
    { operacion: "crear", datos: JSON.parse(JSON.stringify(datos)) },
    z.object({ id: z.string().min(1) }),
  );
  return resultado.id;
}

export async function listarRutinas(
  usuarioId: string,
): Promise<ConId<Rutina>[]> {
  return listar<Rutina>(coleccion(usuarioId), {
    validar,
    ordenarPor: "creadoEn",
    direccion: "desc",
  });
}

export async function obtenerRutina(
  usuarioId: string,
  rutinaId: string,
): Promise<ConId<Rutina> | null> {
  return obtenerPorId<Rutina>(coleccion(usuarioId), rutinaId, validar);
}

export async function actualizarRutina(
  usuarioId: string,
  rutinaId: string,
  datos: Partial<Omit<Rutina, "creadoEn" | "usuarioId">>,
): Promise<void> {
  await invocarFuncion(
    "guardarRutina",
    {
      operacion: "actualizar",
      id: rutinaId,
      datos: JSON.parse(
        JSON.stringify({
          nombre: datos.nombre,
          planSemanal: datos.planSemanal,
        }),
      ),
    },
    z.object({ id: z.string().min(1) }),
  );
}

export async function eliminarRutina(
  usuarioId: string,
  rutinaId: string,
): Promise<void> {
  return eliminar(coleccion(usuarioId), rutinaId);
}

/** Suscripción en tiempo real a todas las rutinas guardadas del usuario. */
export function observarRutinas(
  usuarioId: string,
  callback: (rutinas: ConId<Rutina>[]) => void,
  onError?: (error: Error) => void,
) {
  return observarPorUsuario<Rutina>(usuarioId, "rutinas", callback, {
    validar,
    ordenarPor: "creadoEn",
    direccion: "desc",
    onError,
  });
}
