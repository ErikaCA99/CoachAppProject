import { getFunctions, httpsCallable } from "@firebase/functions";
import { z } from "zod";

import { mensajeDeErrorFunciones } from "@/core/errors/mapError";
import app, { auth } from "@/core/firebase/firebase";

const funciones = getFunctions(app, "us-central1");
/** The SDK supplies Auth and App Check tokens; never store them in Zustand. */
export async function invocarFuncion<T>(
  nombre: string,
  datos: unknown,
  schema: z.ZodType<T>,
  opciones: { timeoutMs?: number } = {},
): Promise<T> {
  if (!auth.currentUser) throw new Error("Inicia sesión para continuar.");
  try {
    const respuesta = await httpsCallable<unknown, unknown>(funciones, nombre, {
      timeout: opciones.timeoutMs ?? 20000,
    })(datos);
    const validacion = schema.safeParse(respuesta.data);
    if (!validacion.success)
      throw new Error("El servidor devolvió datos inválidos.");
    return validacion.data;
  } catch (error) {
    throw new Error(mensajeDeErrorFunciones(error));
  }
}
