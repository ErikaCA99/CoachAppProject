import { Buffer } from "node:buffer";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import {
  busquedaSchema,
  respuestaUsdaSchema,
  escrituraRutinaSchema,
  rutinaSchema,
} from "./schemas.mjs";
import { consumirCuota } from "./quota.mjs";
initializeApp();
const db = getFirestore();
const usdaKey = defineSecret("USDA_API_KEY");
const opciones = {
  region: "us-central1",
  enforceAppCheck: true,
  maxInstances: 5,
  concurrency: 20,
  timeoutSeconds: 20,
  memory: "256MiB",
};

function usuario(request) {
  if (
    !request.auth ||
    request.auth.token.firebase?.sign_in_provider === "anonymous"
  )
    throw new HttpsError("unauthenticated", "Inicia sesión para continuar.");
  if (request.rawRequest?.rawBody?.length > 262144)
    throw new HttpsError("invalid-argument", "Solicitud demasiado grande.");
  return request.auth.uid;
}
function validar(schema, datos) {
  const resultado = schema.safeParse(datos);
  if (!resultado.success)
    throw new HttpsError(
      "invalid-argument",
      "Los datos enviados no son válidos.",
    );
  return resultado.data;
}
async function seguro(operacion, tarea) {
  try {
    return await tarea();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    // No upstream body, URL, query, credential or personal data in logs.
    logger.error("Fallo de operación", {
      operacion,
      tipo: error?.name ?? "Error",
    });
    throw new HttpsError("internal", "No se pudo completar la operación.");
  }
}
export const buscarAlimentos = onCall(
  { ...opciones, secrets: [usdaKey] },
  (request) =>
    seguro("buscarAlimentos", async () => {
      const uid = usuario(request);
      const datos = validar(busquedaSchema, request.data);
      await consumirCuota(db, uid, "usda", { global: true });
      const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
      url.searchParams.set("api_key", usdaKey.value());
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: datos.consulta,
          pageSize: datos.tamanoPagina,
          dataType: ["Foundation", "SR Legacy"],
        }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (response.status === 429)
        throw new HttpsError(
          "resource-exhausted",
          "Servicio de alimentos temporalmente ocupado.",
        );
      if (!response.ok)
        throw new HttpsError(
          "unavailable",
          "Servicio de alimentos no disponible.",
        );
      // Bound actual bytes, not only Content-Length, before parsing an external response.
      const reader = response.body.getReader();
      let size = 0;
      const chunks = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2000000)
            throw new HttpsError(
              "unavailable",
              "Respuesta externa demasiado grande.",
            );
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const resultado = respuestaUsdaSchema.safeParse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
      if (!resultado.success)
        throw new HttpsError("unavailable", "Respuesta externa inválida.");
      return resultado.data;
    }),
);

export const guardarRutina = onCall(opciones, (request) =>
  seguro("guardarRutina", async () => {
    const uid = usuario(request);
    const entrada = validar(escrituraRutinaSchema, request.data);
    await consumirCuota(db, uid, "rutinas");
    const perfil = db.collection("usuarios").doc(uid);
    const coleccion = perfil.collection("rutinas");
    const ref =
      entrada.operacion === "crear"
        ? coleccion.doc()
        : coleccion.doc(entrada.id);
    await db.runTransaction(async (tx) => {
      const usuarioDoc = await tx.get(perfil);
      if (!usuarioDoc.exists)
        throw new HttpsError(
          "failed-precondition",
          "Completa tu perfil primero.",
        );
      if (entrada.operacion === "crear") {
        tx.create(ref, {
          ...entrada.datos,
          usuarioId: uid,
          creadoEn: FieldValue.serverTimestamp(),
        });
      } else {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists)
          throw new HttpsError("not-found", "La rutina ya no existe.");
        const {
          usuarioId: propietario,
          creadoEn,
          actualizadoEn: _fecha,
          ...anterior
        } = snapshot.data();
        if (propietario !== uid)
          throw new HttpsError("permission-denied", "Operación no permitida.");
        const datos = { ...anterior, ...entrada.datos };
        datos.diasPorSemana = datos.planSemanal.length;
        const completo = validar(rutinaSchema, datos);
        tx.set(ref, {
          ...completo,
          usuarioId: uid,
          creadoEn,
          actualizadoEn: FieldValue.serverTimestamp(),
        });
      }
    });
    return { id: ref.id };
  }),
);
