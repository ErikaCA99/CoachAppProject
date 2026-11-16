import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

import { usuario } from "../../shared/auth.mjs";
import { opciones } from "../../shared/config.mjs";
import { seguro, validar } from "../../shared/errors.mjs";
import { db } from "../../shared/firebase.mjs";
import { consumirCuota } from "../../shared/quota.mjs";
import { escrituraRutinaSchema, rutinaSchema } from "./schemas.mjs";

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
