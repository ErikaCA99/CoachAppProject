import { Buffer } from "node:buffer";
import { HttpsError } from "firebase-functions/v2/https";

// Texto de una respuesta de error, solo para el log (nunca se envía al cliente).
export async function leerTextoTruncado(response, limite) {
  try {
    const texto = await response.text();
    return texto.slice(0, limite);
  } catch {
    return "";
  }
}

// Lee el cuerpo de una respuesta externa acotando los bytes reales.
export async function leerJsonAcotado(response, limite) {
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limite)
        throw new HttpsError(
          "unavailable",
          "Respuesta externa demasiado grande.",
        );
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
