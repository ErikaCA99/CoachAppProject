// Tabla 4-30 — Escenarios SEG-01..SEG-16 (reglas de Firestore y Storage).
// Cada prueba negativa incluye un control positivo para demostrar que el
// rechazo se debe al dato evaluado y no a otra condición de la regla.
// Ejecutar: npm run test:security (emuladores, proyecto demo-*).
import { before, after, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/storage";

let env;
const ts = () => firebase.firestore.FieldValue.serverTimestamp();
const db = (uid = "A") =>
  env.authenticatedContext(uid, { email: `${uid.toLowerCase()}@example.test` }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const perfil = (uid = "A", extra = {}) => ({
  nombre: "Usuario",
  email: `${uid.toLowerCase()}@example.test`,
  creadoEn: ts(),
  ...extra,
});
const sembrar = (ruta, datos) =>
  env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(ruta).set(datos));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-coach-security",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
    storage: { rules: await readFile("storage.rules", "utf8") },
  });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await sembrar("maquinas/m1", { nombre: "Prensa" });
  await sembrar("usuarios/A/rutinas/rA", { usuarioId: "A", nombre: "Plan A" });
  await sembrar("usuarios/B/rutinas/rB", { usuarioId: "B", nombre: "Plan B" });
});

test("SEG-01 Usuario no autenticado lee maquinas/{id} → Denegado", async () => {
  await assertFails(anonimo().doc("maquinas/m1").get());
  await assertFails(anonimo().collection("maquinas").limit(10).get());
});

test("SEG-02 A lee maquinas/{id} → Permitido", async () => {
  await assertSucceeds(db().doc("maquinas/m1").get());
  await assertSucceeds(db().collection("maquinas").limit(100).get());
});

test("SEG-03 A escribe maquinas/{id} → Denegado", async () => {
  await assertFails(db().doc("maquinas/m1").set({ nombre: "Alterada" }));
  await assertFails(db().doc("maquinas/m1").update({ nombre: "Alterada" }));
  await assertFails(db().doc("maquinas/m1").delete());
  await assertFails(db().doc("maquinas/nueva").set({ nombre: "Inyectada" }));
});

test("SEG-04 A lee usuarios/A/rutinas → Permitido", async () => {
  await assertSucceeds(db().doc("usuarios/A/rutinas/rA").get());
  await assertSucceeds(db().collection("usuarios/A/rutinas").limit(500).get());
});

test("SEG-05 A lee usuarios/B/rutinas → Denegado", async () => {
  await assertFails(db().doc("usuarios/B/rutinas/rB").get());
  await assertFails(db().collection("usuarios/B/rutinas").limit(20).get());
});

test("SEG-08 A modifica el campo email de su perfil → Denegado", async () => {
  await assertSucceeds(db().doc("usuarios/A").set(perfil()));
  await assertFails(
    db().doc("usuarios/A").update({ email: "otro@example.test", actualizadoEn: ts() }),
  );
  // Control: la misma actualización sin tocar email sí se permite.
  await assertSucceeds(db().doc("usuarios/A").update({ nombre: "Nuevo", actualizadoEn: ts() }));
});

test("SEG-09 A crea su perfil con edad = 10 → Denegado", async () => {
  await assertFails(db().doc("usuarios/A").set(perfil("A", { edad: 10 })));
  await assertSucceeds(db().doc("usuarios/A").set(perfil("A", { edad: 25 })));
});

test("SEG-10 A registra progreso con peso = 0 → Denegado", async () => {
  const ref = db().doc("usuarios/A/progresoFisico/p1");
  await assertFails(ref.set({ usuarioId: "A", peso: 0, creadoEn: ts() }));
  await assertSucceeds(ref.set({ usuarioId: "A", peso: 70, creadoEn: ts() }));
});

test("SEG-11 A registra ingesta con calorias = -100 → Denegado", async () => {
  const ref = db().doc("usuarios/A/registrosNutricionales/n1");
  const ingesta = { usuarioId: "A", alimento: "Arroz", creadoEn: ts() };
  await assertFails(ref.set({ ...ingesta, calorias: -100 }));
  await assertSucceeds(ref.set({ ...ingesta, calorias: 100 }));
});

const entrenamiento = (extra = {}) => ({
  usuarioId: "A",
  rutinaId: "rA",
  dia: 1,
  fecha: "2026-10-26",
  creadoEn: ts(),
  ...extra,
});

test("SEG-12 A crea un entrenamiento cuyo fecha difiere del id del documento → Denegado", async () => {
  const ref = db().doc("usuarios/A/entrenamientos/2026-10-26");
  await assertFails(ref.set(entrenamiento({ fecha: "2026-10-27" })));
  await assertSucceeds(ref.set(entrenamiento()));
});

test("SEG-13 A crea un entrenamiento con dia = 8 → Denegado", async () => {
  const ref = db().doc("usuarios/A/entrenamientos/2026-10-26");
  await assertFails(ref.set(entrenamiento({ dia: 8 })));
  await assertSucceeds(ref.set(entrenamiento({ dia: 7 })));
});

test("SEG-14 A crea su perfil con creadoEn distinto de la hora del servidor → Denegado", async () => {
  const ref = db().doc("usuarios/A");
  await assertFails(ref.set(perfil("A", { creadoEn: firebase.firestore.Timestamp.now() })));
  await assertFails(ref.set(perfil("A", { creadoEn: firebase.firestore.Timestamp.fromMillis(0) })));
  await assertSucceeds(ref.set(perfil("A")));
});

test("SEG-15 A sube un archivo a Storage → Denegado", async () => {
  const storage = env.authenticatedContext("A").storage();
  for (const ruta of ["usuarios/A/foto.jpg", "maquinas/m1.png", "ejercicios/e1.png", "cualquier.txt"])
    await assertFails(storage.ref(ruta).put(new Uint8Array([1, 2, 3])));
});

test("SEG-16 A crea directamente un documento en usuarios/A/rutinas sin la función → Denegado", async () => {
  const valida = {
    usuarioId: "A",
    nombre: "Plan",
    tipo: "personalizada",
    diasPorSemana: 1,
    planSemanal: [{ dia: 1, enfoque: "Pecho", ejercicios: [] }],
    creadoEn: ts(),
  };
  await assertFails(db().doc("usuarios/A/rutinas/nueva").set(valida));
  await assertFails(db().collection("usuarios/A/rutinas").add(valida));
  await assertFails(db().doc("usuarios/A/rutinas/rA").update({ nombre: "Editada" }));
});
