import { before, after, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
  query,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
let env;
const proyecto = "demo-coach-security";
const base = "usuarios/alice";
const db = (uid = "alice") =>
  env.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
const nutricion = () => ({
  usuarioId: "alice",
  alimento: "Arroz",
  calorias: 100,
  creadoEn: serverTimestamp(),
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
    setDoc(doc(db(), base), {
      nombre: "Alice",
      email: "alice@example.test",
      creadoEn: serverTimestamp(),
    }),
  );
  await assertSucceeds(getDoc(doc(db(), base)));
  await assertFails(getDoc(doc(db("bob"), base)));
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), base)),
  );
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
      setDoc(doc(db(), base), {
        nombre: "Alice",
        email: "alice@example.test",
        creadoEn: serverTimestamp(),
        ...extra,
      }),
    );
  }
});
test("perfil: actualización legítima y fecha inmutable", async () => {
  await setDoc(doc(db(), base), {
    nombre: "Alice",
    email: "alice@example.test",
    creadoEn: serverTimestamp(),
  });
  await assertSucceeds(
    updateDoc(doc(db(), base), {
      nombre: "Nuevo",
      actualizadoEn: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db(), base), {
      creadoEn: Timestamp.fromMillis(0),
      actualizadoEn: serverTimestamp(),
    }),
  );
  await assertFails(updateDoc(doc(db(), base), { nombre: "sin fecha" }));
});
test("nutrición admite ambos tipos sin errores por campos ausentes", async () => {
  await assertSucceeds(
    setDoc(doc(db(), `${base}/registrosNutricionales/comida`), nutricion()),
  );
  await assertSucceeds(
    setDoc(doc(db(), `${base}/registrosNutricionales/imc`), {
      usuarioId: "alice",
      weight: 70,
      height: 170,
      bmi: 24.2,
      category: "NORMALIDAD",
      creadoEn: serverTimestamp(),
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
    { creadoEn: Timestamp.fromMillis(1) },
  ]) {
    await assertFails(
      setDoc(doc(db(), `${base}/registrosNutricionales/x`), {
        ...nutricion(),
        ...extra,
      }),
    );
  }
});
test("progreso admite edición y bloquea datos fuera de rango", async () => {
  const referencia = doc(db(), `${base}/progresoFisico/x`);
  await assertSucceeds(
    setDoc(referencia, {
      usuarioId: "alice",
      peso: 70,
      creadoEn: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(referencia, { peso: 71, actualizadoEn: serverTimestamp() }),
  );
  await assertFails(
    updateDoc(referencia, { peso: 1000, actualizadoEn: serverTimestamp() }),
  );
  await assertFails(deleteDoc(doc(db("bob"), `${base}/progresoFisico/x`)));
});
test("rutinas solo se escriben mediante función; propietario puede leer y borrar", async () => {
  const ruta = `${base}/rutinas/x`;
  await assertFails(
    setDoc(doc(db(), ruta), { usuarioId: "alice", planSemanal: [123] }),
  );
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), ruta), { usuarioId: "alice" });
  });
  await assertSucceeds(getDoc(doc(db(), ruta)));
  await assertFails(updateDoc(doc(db(), ruta), { nombre: "Nuevo" }));
  await assertFails(getDoc(doc(db("bob"), ruta)));
  await assertSucceeds(deleteDoc(doc(db(), ruta)));
});
test("entrenamientos requieren rutina propia y preservan creadoEn", async () => {
  const referencia = doc(db(), `${base}/entrenamientos/2026-10-26`);
  const datos = {
    usuarioId: "alice",
    rutinaId: "r",
    dia: 1,
    fecha: "2026-10-26",
    creadoEn: serverTimestamp(),
  };
  await assertFails(setDoc(referencia, datos));
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `${base}/rutinas/r`), {
      usuarioId: "alice",
    });
  });
  await assertSucceeds(setDoc(referencia, datos));
  await assertSucceeds(
    updateDoc(referencia, { dia: 2, actualizadoEn: serverTimestamp() }),
  );
  await assertFails(
    updateDoc(referencia, { dia: 8, actualizadoEn: serverTimestamp() }),
  );
});
test("listados exigen límite y no permiten leer otro usuario", async () => {
  await setDoc(doc(db(), `${base}/registrosNutricionales/x`), nutricion());
  await assertFails(
    getDocs(collection(db(), `${base}/registrosNutricionales`)),
  );
  await assertFails(
    getDocs(
      query(collection(db(), `${base}/registrosNutricionales`), limit(501)),
    ),
  );
  await assertSucceeds(
    getDocs(
      query(collection(db(), `${base}/registrosNutricionales`), limit(500)),
    ),
  );
  await assertFails(
    getDocs(
      query(collection(db("bob"), `${base}/registrosNutricionales`), limit(20)),
    ),
  );
});
test("catálogos son de solo lectura y cuotas privadas del servidor", async () => {
  await assertFails(setDoc(doc(db(), "maquinas/x"), { nombre: "inyección" }));
  await assertFails(getDoc(doc(db(), "_cuotas/x")));
  await assertFails(setDoc(doc(db(), "_cuotas/x"), { usados: 0 }));
  await assertSucceeds(
    getDocs(query(collection(db(), "maquinas"), limit(100))),
  );
});
test("Storage permite catálogo y deniega privados, anónimos y escrituras", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const path of [
      "maquinas/test.png",
      "ejercicios/test.png",
      "privados/test.png",
    ])
      await uploadBytes(ref(ctx.storage(), path), new Uint8Array([1, 2, 3]));
  });
  const usuario = env.authenticatedContext("alice").storage();
  await assertSucceeds(getBytes(ref(usuario, "maquinas/test.png")));
  await assertSucceeds(getBytes(ref(usuario, "ejercicios/test.png")));
  await assertFails(getBytes(ref(usuario, "privados/test.png")));
  await assertFails(
    getBytes(ref(env.unauthenticatedContext().storage(), "maquinas/test.png")),
  );
  await assertFails(
    uploadBytes(ref(usuario, "maquinas/otro.png"), new Uint8Array([1])),
  );
});
