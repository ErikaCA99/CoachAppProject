import { HttpsError } from "firebase-functions/v2/https";

/**
 * UID del usuario autenticado (nunca anónimo). Rechaza además cuerpos que
 * superen el límite de bytes. Es la única fuente del propietario de los datos.
 */
export function usuario(request, limiteBytes = 262144) {
  if (
    !request.auth ||
    request.auth.token.firebase?.sign_in_provider === "anonymous"
  )
    throw new HttpsError("unauthenticated", "Inicia sesión para continuar.");
  if (request.rawRequest?.rawBody?.length > limiteBytes)
    throw new HttpsError("invalid-argument", "Solicitud demasiado grande.");
  return request.auth.uid;
}
