import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { guardarRutina, buscarAlimentos } from "../src/index.mjs";
import { consumirCuota } from "../src/quota.mjs";
// This file is run only via emulators:exec, never against production.
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.GCLOUD_PROJECT?.startsWith("demo-")
)
  throw new Error("Solo se permite el emulador demo.");
const db = getFirestore();
const uid = "function-test-user";
const auth = { uid, token: { firebase: { sign_in_provider: "password" } } };
const rutina = {
  nombre: "Plan",
  tipo: "personalizada",
  diasPorSemana: 1,
  planSemanal: [
    {
      dia: 1,
      enfoque: "Pecho",
      ejercicios: [
        {
          maquinaId: 1,
          nombre: "Press",
          imagenUrl: null,
          series: 3,
          repeticiones: 12,
          descansoSegundos: 60,
        },
      ],
    },
  ],
};
test("funciones deniegan peticiones sin Auth antes de acceder al servidor", async () => {
  for (const fn of [guardarRutina, buscarAlimentos])
    await assert.rejects(fn.run({ data: {}, auth: undefined }), {
      code: "unauthenticated",
    });
});
test("funciones deniegan usuarios anónimos", async () => {
  await assert.rejects(
    guardarRutina.run({
      data: {},
      auth: { uid, token: { firebase: { sign_in_provider: "anonymous" } } },
    }),
    { code: "unauthenticated" },
  );
});
test("función deriva UID de Auth, valida todo el plan y conserva fechas", async () => {
  await db
    .doc(`usuarios/${uid}`)
    .set({
      nombre: "Test",
      email: "test@example.test",
      creadoEn: FieldValue.serverTimestamp(),
    });
  const { id } = await guardarRutina.run({
    auth,
    data: { operacion: "crear", datos: rutina },
  });
  const ref = db.doc(`usuarios/${uid}/rutinas/${id}`);
  const original = (await ref.get()).data();
  assert.equal(original.usuarioId, uid);
  await guardarRutina.run({
    auth,
    data: { operacion: "actualizar", id, datos: { nombre: "Cambio" } },
  });
  const final = (await ref.get()).data();
  assert.equal(final.nombre, "Cambio");
  assert.equal(final.creadoEn.toMillis(), original.creadoEn.toMillis());
  await assert.rejects(
    guardarRutina.run({
      auth: { ...auth, uid: "victima" },
      data: { operacion: "actualizar", id, datos: { nombre: "Ataque" } },
    }),
  );
  await assert.rejects(
    guardarRutina.run({
      auth,
      data: { operacion: "crear", datos: { ...rutina, usuarioId: "victima" } },
    }),
    { code: "invalid-argument" },
  );
});
test("cuota concurrente no puede sobrepasarse y se recupera en siguiente ventana", async () => {
  const sujeto = `quota-${Date.now()}`;
  const ahora = 1800000000000;
  for (let i = 0; i < 19; i++)
    await consumirCuota(db, sujeto, "rutinas", { ahora });
  const resultados = await Promise.allSettled(
    Array.from({ length: 2 }, () =>
      consumirCuota(db, sujeto, "rutinas", { ahora }),
    ),
  );
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(resultados.filter((r) => r.status === "rejected").length, 1);
  await consumirCuota(db, sujeto, "rutinas", { ahora: ahora + 60000 });
});
