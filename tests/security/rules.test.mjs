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
const proyecto = "demo-coach-security";
const base = "usuarios/alice";
const db = (uid = "alice") =>
  env.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
const nutricion = () => ({
  usuarioId: "alice",
  alimento: "Arroz",
  calorias: 100,
  creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId: proyecto,
    firestore: { rules: await readFile("firestore.rules", "utf8") },
    storage: { rules: await readFile("storage.rules", "utf8") },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});
test("perfil: propietario válido, lectura ajena y anónima denegadas", async () => {
  await assertSucceeds(
    db().doc(base).set({
      nombre: "Alice",
      email: "alice@example.test",
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
  await assertSucceeds(db().doc(base).get());
  await assertFails(db("bob").doc(base).get());
  await assertFails(env.unauthenticatedContext().firestore().doc(base).get());
});
test("perfil: rechaza email ajeno, roles y rangos inválidos", async () => {
  for (const extra of [
    { email: "bob@example.test" },
    { admin: true },
    { pesoActual: 999999 },
    { nivel: "root" },
    { edad: 13 },
  ]) {
    await assertFails(
      db()
        .doc(base)
        .set({
          nombre: "Alice",
          email: "alice@example.test",
          creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
          ...extra,
        }),
    );
  }
});
test("perfil: actualización legítima y fecha inmutable", async () => {
  await db().doc(base).set({
    nombre: "Alice",
    email: "alice@example.test",
    creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await assertSucceeds(
    db().doc(base).update({
      nombre: "Nuevo",
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
  await assertFails(
    db()
      .doc(base)
      .update({
        creadoEn: firebase.firestore.Timestamp.fromMillis(0),
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      }),
  );
  await assertFails(db().doc(base).update({ nombre: "sin fecha" }));
});
test("nutrición admite ambos tipos sin errores por campos ausentes", async () => {
  await assertSucceeds(
    db().doc(`${base}/registrosNutricionales/comida`).set(nutricion()),
  );
  await assertSucceeds(
    db().doc(`${base}/registrosNutricionales/imc`).set({
      usuarioId: "alice",
      weight: 70,
      height: 170,
      bmi: 24.2,
      category: "NORMALIDAD",
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
});
test("nutrición rechaza mezcla, campos desconocidos, exceso y suplantación", async () => {
  for (const extra of [
    { weight: 70 },
    { usuarioId: "bob" },
    { calorias: 10001 },
    { proteinas: -1 },
    { admin: true },
    { creadoEn: firebase.firestore.Timestamp.fromMillis(1) },
  ]) {
    await assertFails(
      db()
        .doc(`${base}/registrosNutricionales/x`)
        .set({
          ...nutricion(),
          ...extra,
        }),
    );
  }
});
test("progreso admite edición y bloquea datos fuera de rango", async () => {
  const referencia = db().doc(`${base}/progresoFisico/x`);
  await assertSucceeds(
    referencia.set({
      usuarioId: "alice",
      peso: 70,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
  await assertSucceeds(
    referencia.update({
      peso: 71,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
  await assertFails(
    referencia.update({
      peso: 1000,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
  await assertFails(db("bob").doc(`${base}/progresoFisico/x`).delete());
});
test("rutinas solo se escriben mediante función; propietario puede leer y borrar", async () => {
  const ruta = `${base}/rutinas/x`;
  await assertFails(
    db()
      .doc(ruta)
      .set({ usuarioId: "alice", planSemanal: [123] }),
  );
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(ruta).set({ usuarioId: "alice" });
  });
  await assertSucceeds(db().doc(ruta).get());
  await assertFails(db().doc(ruta).update({ nombre: "Nuevo" }));
  await assertFails(db("bob").doc(ruta).get());
  await assertSucceeds(db().doc(ruta).delete());
});
test("entrenamientos requieren rutina propia y preservan creadoEn", async () => {
  const referencia = db().doc(`${base}/entrenamientos/2026-10-26`);
  const datos = {
    usuarioId: "alice",
    rutinaId: "r",
    dia: 1,
    fecha: "2026-10-26",
    creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await assertFails(referencia.set(datos));
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`${base}/rutinas/r`).set({
      usuarioId: "alice",
    });
  });
  await assertSucceeds(referencia.set(datos));
  await assertSucceeds(
    referencia.update({
      dia: 2,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
  await assertFails(
    referencia.update({
      dia: 8,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    }),
  );
});
test("listados exigen límite y no permiten leer otro usuario", async () => {
  await db().doc(`${base}/registrosNutricionales/x`).set(nutricion());
  await assertFails(db().collection(`${base}/registrosNutricionales`).get());
  await assertFails(
    db().collection(`${base}/registrosNutricionales`).limit(501).get(),
  );
  await assertSucceeds(
    db().collection(`${base}/registrosNutricionales`).limit(500).get(),
  );
  await assertFails(
    db("bob").collection(`${base}/registrosNutricionales`).limit(20).get(),
  );
});
test("catálogos son de solo lectura y cuotas privadas del servidor", async () => {
  await assertFails(db().doc("maquinas/x").set({ nombre: "inyección" }));
  await assertFails(db().doc("_cuotas/x").get());
  await assertFails(db().doc("_cuotas/x").set({ usados: 0 }));
  await assertSucceeds(db().collection("maquinas").limit(100).get());
});
test("Storage permite catálogo y deniega privados, anónimos y escrituras", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const path of [
      "maquinas/test.png",
      "ejercicios/test.png",
      "privados/test.png",
    ])
      await ctx
        .storage()
        .ref(path)
        .put(new Uint8Array([1, 2, 3]));
  });
  const usuario = env.authenticatedContext("alice").storage();
  await assertSucceeds(usuario.ref("maquinas/test.png").getMetadata());
  await assertSucceeds(usuario.ref("ejercicios/test.png").getMetadata());
  await assertFails(usuario.ref("privados/test.png").getMetadata());
  await assertFails(
    env
      .unauthenticatedContext()
      .storage()
      .ref("maquinas/test.png")
      .getMetadata(),
  );
  await assertFails(usuario.ref("maquinas/otro.png").put(new Uint8Array([1])));
});
