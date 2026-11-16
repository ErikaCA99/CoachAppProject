import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

import { usuario } from "../../shared/auth.mjs";
import { opciones } from "../../shared/config.mjs";
import { seguro, validar } from "../../shared/errors.mjs";
import { db } from "../../shared/firebase.mjs";
import { leerJsonAcotado } from "../../shared/http.mjs";
import { consumirCuota } from "../../shared/quota.mjs";
import { busquedaSchema, respuestaUsdaSchema } from "./schemas.mjs";

const usdaKey = defineSecret("USDA_API_KEY");

export const buscarAlimentos = onCall(
  { ...opciones, secrets: [usdaKey] },
  (request) =>
    seguro("buscarAlimentos", async () => {
      const uid = usuario(request);
      const datos = validar(busquedaSchema, request.data);
      await consumirCuota(db, uid, "usda", { global: true });
      const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
      url.searchParams.set("api_key", usdaKey.value());
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: datos.consulta,
          pageSize: datos.tamanoPagina,
          dataType: ["Foundation", "SR Legacy"],
        }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (response.status === 429)
        throw new HttpsError(
          "resource-exhausted",
          "Servicio de alimentos temporalmente ocupado.",
        );
      if (!response.ok)
        throw new HttpsError(
          "unavailable",
          "Servicio de alimentos no disponible.",
        );
      // Acota los bytes reales (no solo Content-Length) antes de parsear.
      const resultado = respuestaUsdaSchema.safeParse(
        await leerJsonAcotado(response, 2000000),
      );
      if (!resultado.success)
        throw new HttpsError("unavailable", "Respuesta externa inválida.");
      return resultado.data;
    }),
);
