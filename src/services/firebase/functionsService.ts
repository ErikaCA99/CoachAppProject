import { getFunctions, httpsCallable } from "@firebase/functions";
import app, { auth } from "@/services/firebase/firebase";
import { z } from "zod";

const funciones = getFunctions(app, "us-central1");
/** The SDK supplies Auth and App Check tokens; never store them in Zustand. */
export async function invocarFuncion<T>(
  nombre: string,
  datos: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!auth.currentUser) throw new Error("Inicia sesión para continuar.");
  try {
    const respuesta = await httpsCallable<unknown, unknown>(funciones, nombre, {
      timeout: 20000,
    })(datos);
    const validacion = schema.safeParse(respuesta.data);
    if (!validacion.success)
      throw new Error("El servidor devolvió datos inválidos.");
    return validacion.data;
  } catch (error) {
    const codigo =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    const mensajes: Record<string, string> = {
      "functions/unauthenticated":
        "No se pudo verificar la sesión o la aplicación. Vuelve a iniciar sesión y usa una versión actualizada.",
      "functions/resource-exhausted":
        "Has alcanzado el límite de solicitudes. Intenta más tarde.",
      "functions/invalid-argument": "Revisa los datos enviados.",
      "functions/not-found": "El recurso solicitado no está disponible.",
      "functions/permission-denied": "No tienes permiso para esta operación.",
      "functions/failed-precondition": "Completa tu perfil antes de continuar.",
    };
    throw new Error(
      mensajes[codigo] ??
        "No se pudo contactar con el servicio. Intenta nuevamente.",
    );
  }
}
