// Tabla 4-30 — Escenarios SEG-06, SEG-07, SEG-17, SEG-18 y SEG-19
// (Cloud Functions callables). Solo contra el emulador demo-*.
import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { guardarRutina, buscarAlimentos, reconocerMaquina } from "../src/index.mjs";
import { consumirCuota } from "../src/shared/quota.mjs";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-"))
  throw new Error("Solo se permite el emulador demo.");

const db = getFirestore();
const auth = (uid, proveedor = "password") => ({
  uid,
  token: { firebase: { sign_in_provider: proveedor } },
});
const rutina = {
  nombre: "Plan",
  tipo: "personalizada",
  diasPorSemana: 1,
  planSemanal: [
    {
      dia: 1,
      enfoque: "Pecho",
      ejercicios: [
        { maquinaId: 1, nombre: "Press", imagenUrl: null, series: 3, repeticiones: 12, descansoSegundos: 60 },
      ],
    },
  ],
};
const crearPerfil = (uid) =>
  db.doc(`usuarios/${uid}`).set({ nombre: "T", email: `${uid}@example.test`, creadoEn: FieldValue.serverTimestamp() });
const contarRutinas = async (uid) => (await db.collection(`usuarios/${uid}/rutinas`).get()).size;
const funciones = { guardarRutina, buscarAlimentos, reconocerMaquina };

test("SEG-06 A envía a guardarRutina una rutina con diasPorSemana = 8 → Rechazado", async () => {
  const uid = "seg06-A";
  await crearPerfil(uid);
  await assert.rejects(
    guardarRutina.run({ auth: auth(uid), data: { operacion: "crear", datos: { ...rutina, diasPorSemana: 8 } } }),
    { code: "invalid-argument" },
  );
  // Tampoco con 8 días reales en el plan (máximo 7).
  const ochoDias = Array.from({ length: 8 }, (_, i) => ({ ...rutina.planSemanal[0], dia: (i % 7) + 1 }));
  await assert.rejects(
    guardarRutina.run({ auth: auth(uid), data: { operacion: "crear", datos: { ...rutina, diasPorSemana: 8, planSemanal: ochoDias } } }),
    { code: "invalid-argument" },
  );
  assert.equal(await contarRutinas(uid), 0);
});

test("SEG-07 A envía a guardarRutina una rutina con usuarioId = B → Rechazado (propietario = identidad autenticada)", async () => {
  const [A, B] = ["seg07-A", "seg07-B"];
  await crearPerfil(A);
  await crearPerfil(B);
  await assert.rejects(
    guardarRutina.run({ auth: auth(A), data: { operacion: "crear", datos: { ...rutina, usuarioId: B } } }),
    { code: "invalid-argument" },
  );
  assert.equal(await contarRutinas(B), 0);
  // Control: sin usuarioId, la rutina se guarda bajo A con usuarioId = A.
  const { id } = await guardarRutina.run({ auth: auth(A), data: { operacion: "crear", datos: rutina } });
  assert.equal((await db.doc(`usuarios/${A}/rutinas/${id}`).get()).data().usuarioId, A);
  // A no puede actualizar la rutina de B aunque conozca su id.
  const { id: idB } = await guardarRutina.run({ auth: auth(B), data: { operacion: "crear", datos: rutina } });
  await assert.rejects(
    guardarRutina.run({ auth: auth(A), data: { operacion: "actualizar", id: idB, datos: { nombre: "Ataque" } } }),
    { code: "not-found" },
  );
  assert.equal((await db.doc(`usuarios/${B}/rutinas/${idB}`).get()).data().nombre, "Plan");
});

test("SEG-17 guardarRutina, buscarAlimentos o reconocerMaquina sin autenticación → Rechazado", async () => {
  for (const [nombre, fn] of Object.entries(funciones))
    await assert.rejects(fn.run({ data: {}, auth: undefined }), { code: "unauthenticated" }, nombre);
});

test("SEG-18 Llamada a las funciones con un usuario anónimo → Rechazado", async () => {
  for (const [nombre, fn] of Object.entries(funciones))
    await assert.rejects(
      fn.run({ data: {}, auth: auth("anon-1", "anonymous") }),
      { code: "unauthenticated" },
      nombre,
    );
});

test("SEG-19 Solicitudes concurrentes que superan la cuota por usuario → Limitadas a la cuota", async () => {
  const ahora = 1800000000000; // ventana fija para que la prueba sea determinista
  const A = `seg19-A-${Date.now()}`;
  const B = `seg19-B-${Date.now()}`;
  // 25 solicitudes simultáneas contra un máximo de 20 por minuto.
  const resultados = await Promise.allSettled(
    Array.from({ length: 25 }, () => consumirCuota(db, A, "rutinas", { ahora })),
  );
  const ok = resultados.filter((r) => r.status === "fulfilled").length;
  const rechazos = resultados.filter((r) => r.status === "rejected");
  assert.equal(ok, 20, "exactamente la cuota");
  assert.equal(rechazos.length, 5);
  for (const r of rechazos) assert.equal(r.reason.code, "resource-exhausted");
  // La cuota es por usuario: B no se ve afectado por el consumo de A.
  await consumirCuota(db, B, "rutinas", { ahora });
  // Se recupera en la siguiente ventana.
  await consumirCuota(db, A, "rutinas", { ahora: ahora + 60000 });
  // USDA: 15 por minuto.
  const usda = await Promise.allSettled(
    Array.from({ length: 20 }, () => consumirCuota(db, A, "usda", { ahora })),
  );
  assert.equal(usda.filter((r) => r.status === "fulfilled").length, 15);
});
