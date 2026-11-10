import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ALIAS_CLASES,
  CLASES_SIN_FICHA,
  ETIQUETAS_MAQUINAS,
  interpretarRespuesta,
  normalizarClase,
  normalizarCaja,
  resumirRespuesta,
} from "../src/reconocimiento.mjs";
import {
  reconocimientoSchema,
  respuestaReconocimientoSchema,
} from "../src/schemas.mjs";

test("las etiquetas del servidor coinciden con las de la app", () => {
  const ts = readFileSync(
    new URL("../../src/services/ai/machineLabels.ts", import.meta.url),
    "utf8",
  );
  const bloque = ts.slice(ts.indexOf("[", ts.indexOf("=")), ts.indexOf("];"));
  const app = [...bloque.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ETIQUETAS_MAQUINAS, app);
});

test("normaliza nombres de clase", () => {
  assert.equal(normalizarClase("Prensa Piernas"), "prensa-piernas");
  assert.equal(normalizarClase("  Prensa_de_Piernás "), "prensa-de-piernas");
});

const respuesta = (resultados) => ({
  images: [{ shape: [480, 640], results: resultados }],
  metadata: { task: "detect" },
});
const det = (name, confidence, cls = 0) => ({
  class: cls,
  name,
  confidence,
  box: { x1: 1, y1: 2, x2: 3, y2: 4 },
});

test("detección: conserva la mayor confianza por clase y ordena", () => {
  const r = interpretarRespuesta(
    respuesta([
      det("smith", 0.4),
      det("prensa-piernas", 0.9),
      det("smith", 0.7),
      det("banco-pecho", 0.2),
      det("smith", 0.1),
    ]),
  );
  assert.deepEqual(r, [
    {
      maquinaId: "prensa-piernas",
      confianza: 0.9,
      caja: { x1: 1 / 640, y1: 2 / 480, x2: 3 / 640, y2: 4 / 480 },
    },
    {
      maquinaId: "smith",
      confianza: 0.7,
      caja: { x1: 1 / 640, y1: 2 / 480, x2: 3 / 640, y2: 4 / 480 },
    },
    {
      maquinaId: "banco-pecho",
      confianza: 0.2,
      caja: { x1: 1 / 640, y1: 2 / 480, x2: 3 / 640, y2: 4 / 480 },
    },
  ]);
});

test("las 3 clases con otro nombre se convierten al id del catálogo", () => {
  const r = interpretarRespuesta(
    respuesta([
      det("bicep_curl_machine", 0.9),
      det("hip_adduction_machine", 0.8),
      det("extension-cuadriceps", 0.7),
    ]),
  );
  assert.deepEqual(
    r.map((x) => x.maquinaId),
    ["curl-biceps", "abductores-aductores", "extension-piernas"],
  );
});

// Clases del detector YOLO26m desplegado (Ultralytics, gym-machines-data).
const CLASES_DETECTOR_V2 = [
  "prensa-piernas", "abductores-aductores", "curl-biceps", "curl-femoral",
  "extension-piernas", "press-pecho", "press-hombro", "smith", "pec-deck",
  "estacion-poleas", "dominadas-fondos-asistidos", "extension-espalda",
  "jalon-pecho", "caminadora", "bicicleta-estatica", "mancuerdas", "remo-t",
  "pelota", "barra_de_pesas", "step_aerobics", "saco_boxeo", "pesa_rusa",
  "abdominal", "banco-pecho", "triceps", "pantorrillas", "patada-gluteo",
  "hip-thrust", "eliptica", "extension-curl-piernas", "multiestacion",
  "palanca-peso-muerto", "remo-sentado", "torso-rotatorio", "escaladora",
  "sentadilla-guiada", "biceps-triceps", "elevaciones-laterales",
  "banco-predicador", "multicadera", "rack-sentadilla",
];

test("las 41 clases del detector: las 35 del catálogo llegan, 6 se ignoran", () => {
  assert.equal(CLASES_DETECTOR_V2.length, 41);
  const ids = CLASES_DETECTOR_V2.map(
    (n) => ALIAS_CLASES[normalizarClase(n)] ?? normalizarClase(n),
  );
  const conFicha = ids.filter((id) => ETIQUETAS_MAQUINAS.includes(id));
  const sinFicha = ids.filter((id) => !ETIQUETAS_MAQUINAS.includes(id));
  assert.deepEqual([...conFicha].sort(), [...ETIQUETAS_MAQUINAS].sort());
  assert.deepEqual(sinFicha.sort(), [...CLASES_SIN_FICHA].sort());
});

test("descarta clases sin ficha, confianzas inválidas y respuestas vacías", () => {
  assert.deepEqual(
    interpretarRespuesta(
      respuesta([
        det("press-alto", 0.99),
        det("smith", 1.5),
        det("smith", "alta"),
        det("abdominal", -1),
      ]),
    ),
    [],
  );
  assert.deepEqual(interpretarRespuesta(null), []);
  assert.deepEqual(interpretarRespuesta({}), []);
  assert.deepEqual(interpretarRespuesta(respuesta([])), []);
});

test("limita a tres sugerencias", () => {
  const r = interpretarRespuesta(
    respuesta(
      ETIQUETAS_MAQUINAS.slice(0, 6).map((n, i) => det(n, 0.9 - i * 0.1)),
    ),
  );
  assert.equal(r.length, 3);
});

test("valida la imagen recibida: solo JPEG en base64 y con tope de tamaño", () => {
  const jpeg = "/9j/" + "A".repeat(200);
  assert.equal(
    reconocimientoSchema.safeParse({ imagenBase64: jpeg }).success,
    true,
  );
  assert.equal(
    reconocimientoSchema.safeParse({ imagenBase64: "iVBOR" + "A".repeat(200) })
      .success,
    false,
  );
  assert.equal(
    reconocimientoSchema.safeParse({
      imagenBase64: "/9j/" + "A".repeat(450000),
    }).success,
    false,
  );
  assert.equal(
    reconocimientoSchema.safeParse({ imagenBase64: jpeg, extra: 1 }).success,
    false,
  );
  assert.equal(
    reconocimientoSchema.safeParse({
      imagenBase64: "/9j/ no base64 !" + "A".repeat(100),
    }).success,
    false,
  );
});

test("la respuesta al cliente exige confianza entre 0 y 1", () => {
  assert.equal(
    respuestaReconocimientoSchema.safeParse({
      sugerencias: [{ maquinaId: "smith", confianza: 0.5 }],
    }).success,
    true,
  );
  assert.equal(
    respuestaReconocimientoSchema.safeParse({
      sugerencias: [{ maquinaId: "smith", confianza: 2 }],
    }).success,
    false,
  );
});

test("conserva la caja de la detección ganadora, no la de otra instancia de la misma clase", () => {
  const principal = {
    ...det("smith", 0.95),
    box: { x1: 320, y1: 120, x2: 640, y2: 480 },
  };
  const [resultado] = interpretarRespuesta(
    respuesta([det("smith", 0.5), principal]),
  );
  assert.deepEqual(resultado.caja, { x1: 0.5, y1: 0.25, x2: 1, y2: 1 });
  assert.equal(
    respuestaReconocimientoSchema.safeParse({ sugerencias: [resultado] })
      .success,
    true,
  );
});

test("sin geometría válida conserva la clasificación pero no inventa coordenadas", () => {
  for (const box of [
    null,
    { x1: -1, y1: 0, x2: 10, y2: 10 },
    { x1: 5, y1: 0, x2: 2, y2: 10 },
    { x1: 0, y1: 0, x2: Infinity, y2: 10 },
    { x1: 0, y1: 0, x2: 641, y2: 10 },
  ]) {
    assert.equal(normalizarCaja(box, [480, 640]), undefined);
  }
  assert.equal(normalizarCaja(det("smith", 0.8).box, undefined), undefined);
  const [resultado] = interpretarRespuesta({
    images: [{ results: [det("smith", 0.9)] }],
  });
  assert.deepEqual(resultado, { maquinaId: "smith", confianza: 0.9 });
  assert.equal(
    respuestaReconocimientoSchema.safeParse({
      sugerencias: [{ ...resultado, caja: { x1: 0.8, y1: 0, x2: 0.2, y2: 1 } }],
    }).success,
    false,
  );
});

// Ejemplo de respuesta del contrato OpenAPI (docs/ultralytics-endpoint.openapi.yaml).
const EJEMPLO_CONTRATO = (name, confidence) => ({
  images: [
    {
      shape: [480, 640],
      results: [
        { name, class: 0, confidence, box: { x1: 10, y1: 20, x2: 100, y2: 200 } },
      ],
    },
  ],
  metadata: { imageCount: 1, functionTimeCall: 0.018 },
});

test("contrato OpenAPI: interpreta la respuesta de /predict", () => {
  assert.deepEqual(interpretarRespuesta(EJEMPLO_CONTRATO("prensa-piernas", 0.92)), [
    {
      maquinaId: "prensa-piernas",
      confianza: 0.92,
      caja: { x1: 10 / 640, y1: 20 / 480, x2: 100 / 640, y2: 200 / 480 },
    },
  ]);
  // Una clase ajena al catálogo (la del ejemplo oficial) no llega a la app.
  assert.deepEqual(interpretarRespuesta(EJEMPLO_CONTRATO("person", 0.92)), []);
  assert.deepEqual(interpretarRespuesta(EJEMPLO_CONTRATO("pesa_rusa", 0.9)), []);
});

test("resumen para logs: clase y confianza crudas, sin cajas", () => {
  assert.deepEqual(resumirRespuesta(EJEMPLO_CONTRATO("pesa_rusa", 0.91234)), [
    { clase: "pesa_rusa", confianza: 0.912 },
  ]);
  assert.deepEqual(resumirRespuesta(null), []);
});
