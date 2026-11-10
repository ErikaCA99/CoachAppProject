// Prueba manual del endpoint dedicado de Ultralytics (gym-detect-object).
// Contrato: docs/ultralytics-endpoint.openapi.yaml
//
// Uso (PowerShell, desde functions/):
//   $env:ULTRALYTICS_API_KEY = "ul_..."      # la misma clave del secreto
//   npm run probar:endpoint -- ruta\a\foto.jpg [conf]   (conf por defecto: ULTRALYTICS_CONF o 0.25)
//
// La URL se lee de functions/.env (ULTRALYTICS_ENDPOINT_URL). La clave no se
// guarda en ningún archivo.
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import {
  interpretarRespuesta,
  resumirRespuesta,
} from "../src/reconocimiento.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");
const [foto, conf = process.env.ULTRALYTICS_CONF ?? "0.25"] =
  process.argv.slice(2);
const base = process.env.ULTRALYTICS_ENDPOINT_URL?.replace(/\/+$/, "");
const clave = process.env.ULTRALYTICS_API_KEY;

if (!base?.startsWith("https://")) {
  console.error("Falta ULTRALYTICS_ENDPOINT_URL (https) en functions/.env");
  process.exit(1);
}

// 1) /health no requiere clave: confirma que el endpoint está encendido.
const t0 = Date.now();
const salud = await fetch(`${base}/health`).catch((e) => e);
console.log(
  "GET /health →",
  salud instanceof Error ? salud.message : salud.status,
  salud instanceof Error ? "" : await salud.text(),
  `(${Date.now() - t0} ms, incluye arranque en frío)`,
);

if (!foto) {
  console.log("Pasa una foto para probar /predict.");
  process.exit(0);
}
if (!clave) {
  console.error("Define $env:ULTRALYTICS_API_KEY para probar /predict.");
  process.exit(1);
}

// 2) /predict con los mismos parámetros que la Cloud Function.
const form = new FormData();
form.append(
  "file",
  new Blob([readFileSync(foto)], { type: "image/jpeg" }),
  basename(foto),
);
form.append("conf", conf);
form.append("iou", process.env.ULTRALYTICS_IOU ?? "0.5");
form.append("imgsz", process.env.ULTRALYTICS_IMGSZ ?? "640");
form.append("normalize", "false");

const t1 = Date.now();
const res = await fetch(`${base}/predict`, {
  method: "POST",
  headers: { Authorization: `Bearer ${clave}` },
  body: form,
});
const texto = await res.text();
console.log(`POST /predict → ${res.status} (${Date.now() - t1} ms)`);
if (!res.ok) {
  const ayuda = {
    400: "imagen inválida o corrupta",
    401: "clave inválida o de otro endpoint",
    413: "archivo > 100 MB",
    422: "parámetros inválidos",
    429: `endpoint ocupado; Retry-After ${res.headers.get("retry-after")}`,
    500: "error de inferencia en Ultralytics",
  };
  console.error(ayuda[res.status] ?? "error", texto.slice(0, 500));
  process.exit(1);
}
const datos = JSON.parse(texto);
console.log("shape:", datos?.images?.[0]?.shape, "speed:", datos?.images?.[0]?.speed);
console.log("Detecciones crudas:", resumirRespuesta(datos));
console.log("Sugerencias del catálogo:", interpretarRespuesta(datos));
