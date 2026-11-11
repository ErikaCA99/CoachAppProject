import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

// Fixed per-subject documents avoid unbounded collections. Transactions make
// limits effective across instances. Store only hashed identifiers, never tokens.
export async function consumirCuota(
  db,
  uid,
  operacion,
  { global = false, ahora = Date.now() } = {},
) {
  const ventanas = [
    { sujeto: uid, duracion: 60000, max: operacion === "usda" ? 15 : 20 },
    { sujeto: uid, duracion: 3600000, max: operacion === "usda" ? 120 : 200 },
    ...(global ? [{ sujeto: "global", duracion: 3600000, max: 800 }] : []),
  ];
  await db.runTransaction(async (tx) => {
    const entradas = ventanas.map((v) => ({
      ...v,
      ref: db
        .collection("_cuotas")
        .doc(
          createHash("sha256")
            .update(`${operacion}:${v.sujeto}:${v.duracion}`)
            .digest("hex"),
        ),
    }));
    const snapshots = await tx.getAll(...entradas.map((e) => e.ref));
    entradas.forEach((e, i) => {
      const anterior = snapshots[i].data();
      const inicio = Math.floor(ahora / e.duracion) * e.duracion;
      const usados = anterior?.inicio === inicio ? anterior.usados : 0;
      if (usados >= e.max)
        throw new HttpsError(
          "resource-exhausted",
          "Límite de solicitudes alcanzado. Intenta más tarde.",
        );
      tx.set(e.ref, {
        inicio,
        usados: usados + 1,
        expiraEn: Timestamp.fromMillis(inicio + e.duracion * 2),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    });
  });
}
