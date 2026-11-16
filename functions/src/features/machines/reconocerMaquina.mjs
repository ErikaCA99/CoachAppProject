import { Buffer } from "node:buffer";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";

import { usuario } from "../../shared/auth.mjs";
import { opciones } from "../../shared/config.mjs";
import { seguro, validar } from "../../shared/errors.mjs";
import { db } from "../../shared/firebase.mjs";
import { leerJsonAcotado, leerTextoTruncado } from "../../shared/http.mjs";
import { consumirCuota } from "../../shared/quota.mjs";
import { interpretarRespuesta, resumirRespuesta } from "./reconocimiento.mjs";
import {
  reconocimientoSchema,
  respuestaReconocimientoSchema,
} from "./schemas.mjs";

// Reconocimiento de máquinas (endpoint dedicado de Ultralytics Platform). La
// clave del despliegue vive solo en Secret Manager; la URL no es secreta y se
// lee de functions/.env.
const ultralyticsKey = defineSecret("ULTRALYTICS_API_KEY");
const ultralyticsUrl = defineString("ULTRALYTICS_ENDPOINT_URL");
// Parámetros de inferencia del endpoint (los del ejemplo de Ultralytics Platform).
const ultralyticsConf = defineString("ULTRALYTICS_CONF", { default: "0.25" });
const ultralyticsIou = defineString("ULTRALYTICS_IOU", { default: "0.5" });
const ultralyticsImgsz = defineString("ULTRALYTICS_IMGSZ", { default: "640" });

/** Número dentro del rango del contrato OpenAPI; si no, el valor por defecto. */
function parametroNumerico(param, min, max, porDefecto) {
  const valor = Number(param.value());
  return Number.isFinite(valor) && valor >= min && valor <= max
    ? valor
    : porDefecto;
}

export const reconocerMaquina = onCall(
  // El plan gratuito (1 vCPU) escala a cero: el primer arranque tarda hasta ~1 min.
  { ...opciones, secrets: [ultralyticsKey], timeoutSeconds: 60 },
  (request) =>
    seguro("reconocerMaquina", async () => {
      // La foto en base64 supera el límite de 256 KB de las otras funciones.
      const uid = usuario(request, 600000);
      const { imagenBase64 } = validar(reconocimientoSchema, request.data);
      await consumirCuota(db, uid, "reconocer", { global: true });
      const url = new URL(ultralyticsUrl.value());
      if (url.protocol !== "https:")
        throw new HttpsError(
          "failed-precondition",
          "Servicio de reconocimiento no configurado.",
        );
      if (!url.pathname.endsWith("/predict"))
        url.pathname = `${url.pathname.replace(/\/+$/, "")}/predict`;
      // Contrato: docs/ultralytics-endpoint.openapi.yaml (gym-detect-object,
      // version-003, southamerica-west1). Se envía el JPEG en `file`
      // (multipart); `source` también acepta base64 pero pesa un 33 % más.
      const form = new FormData();
      form.append(
        "file",
        new Blob([Buffer.from(imagenBase64, "base64")], { type: "image/jpeg" }),
        "foto.jpg",
      );
      // Rangos del contrato: conf 0.01–1, iou 0–0.95, imgsz 32–1280.
      form.append("conf", String(parametroNumerico(ultralyticsConf, 0.01, 1, 0.25)));
      form.append("iou", String(parametroNumerico(ultralyticsIou, 0, 0.95, 0.5)));
      form.append(
        "imgsz",
        String(Math.round(parametroNumerico(ultralyticsImgsz, 32, 1280, 640))),
      );
      // Contrato explícito: Ultralytics entrega píxeles; los normalizamos una sola vez.
      form.append("normalize", "false");
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ultralyticsKey.value()}` },
        body: form,
        signal: AbortSignal.timeout(50000),
        redirect: "error",
      });
      if (!response.ok) {
        // Códigos del contrato OpenAPI del endpoint (docs/ultralytics-endpoint.openapi.yaml).
        logger.warn("Ultralytics respondió con error", {
          status: response.status,
          retryAfter: response.headers.get("retry-after"),
          detalle: await leerTextoTruncado(response, 2000),
        });
        if (response.status === 429)
          throw new HttpsError(
            "resource-exhausted",
            "Servicio de reconocimiento temporalmente ocupado.",
          );
        if ([400, 413, 422].includes(response.status))
          throw new HttpsError(
            "invalid-argument",
            "La foto no es válida para el reconocimiento.",
          );
        // 401 = clave inválida o de otro endpoint; 500 = error de inferencia.
        throw new HttpsError(
          "unavailable",
          "Servicio de reconocimiento no disponible.",
        );
      }
      const datos = await leerJsonAcotado(response, 1000000);
      const sugerencias = interpretarRespuesta(datos);
      // Diagnóstico: qué devolvió YOLO y qué llegó al catálogo (sin la foto).
      logger.info("reconocerMaquina", {
        detecciones: resumirRespuesta(datos),
        sugerencias: sugerencias.map((s) => s.maquinaId),
      });
      const resultado = respuestaReconocimientoSchema.safeParse({
        sugerencias,
      });
      if (!resultado.success)
        throw new HttpsError("unavailable", "Respuesta externa inválida.");
      return resultado.data;
    }),
);
