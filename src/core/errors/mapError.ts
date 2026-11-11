/**
 * Manejo centralizado de errores remotos. Traduce los códigos de Firebase
 * (`auth/…`, `functions/…`) a mensajes en español para la Vista; ningún
 * mensaje técnico, URL ni dato del servidor llega a la interfaz.
 */

/** Código de un error de Firebase (`auth/invalid-email`…) o `""` si no tiene. */
export function codigoDeError(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

const MENSAJES_FUNCIONES: Record<string, string> = {
  "functions/unauthenticated":
    "No se pudo verificar la sesión o la aplicación. Vuelve a iniciar sesión y usa una versión actualizada.",
  "functions/resource-exhausted":
    "Has alcanzado el límite de solicitudes. Intenta más tarde.",
  "functions/invalid-argument": "Revisa los datos enviados.",
  "functions/not-found": "El recurso solicitado no está disponible.",
  "functions/permission-denied": "No tienes permiso para esta operación.",
  "functions/failed-precondition": "Completa tu perfil antes de continuar.",
};

/** Mensaje para un error de una Cloud Function callable. */
export function mensajeDeErrorFunciones(error: unknown): string {
  return (
    MENSAJES_FUNCIONES[codigoDeError(error)] ??
    "No se pudo contactar con el servicio. Intenta nuevamente."
  );
}

/** Mensaje para un error de Firebase Authentication. */
export function mensajeDeErrorAuth(error: unknown): string {
  switch (codigoDeError(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos";
    case "auth/invalid-email":
      return "Correo electrónico inválido";
    case "auth/email-already-in-use":
      return "Este correo ya está registrado";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta más tarde";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet";
    default:
      return "Ocurrió un error inesperado. Intenta nuevamente";
  }
}
