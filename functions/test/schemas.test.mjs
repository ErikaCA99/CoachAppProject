import test from "node:test";
import assert from "node:assert/strict";
import {
  busquedaSchema,
  escrituraRutinaSchema,
  rutinaSchema,
  respuestaUsdaSchema,
} from "../src/schemas.mjs";
const ejercicio = {
  maquinaId: 1,
  nombre: "Press",
  imagenUrl: null,
  series: 3,
  repeticiones: 12,
  descansoSegundos: 60,
};
const rutina = {
  nombre: "Plan",
  tipo: "personalizada",
  diasPorSemana: 1,
  planSemanal: [{ dia: 1, enfoque: "Pecho", ejercicios: [ejercicio] }],
};
test("acepta una rutina completa y rechaza suplantación del propietario", () => {
  assert.equal(
    escrituraRutinaSchema.safeParse({ operacion: "crear", datos: rutina })
      .success,
    true,
  );
  assert.equal(
    escrituraRutinaSchema.safeParse({
      operacion: "crear",
      datos: { ...rutina, usuarioId: "victima" },
    }).success,
    false,
  );
});
for (const [nombre, cambio] of [
  ["lista de números", { planSemanal: [123] }],
  ["días inconsistentes", { diasPorSemana: 2 }],
  [
    "días repetidos",
    {
      diasPorSemana: 2,
      planSemanal: [rutina.planSemanal[0], rutina.planSemanal[0]],
    },
  ],
  ["campo inesperado", { admin: true }],
  [
    "lista excesiva",
    {
      planSemanal: [
        { ...rutina.planSemanal[0], ejercicios: Array(21).fill(ejercicio) },
      ],
    },
  ],
  [
    "URL insegura",
    {
      planSemanal: [
        {
          ...rutina.planSemanal[0],
          ejercicios: [{ ...ejercicio, imagenUrl: "javascript:alert(1)" }],
        },
      ],
    },
  ],
  [
    "valores fuera de rango",
    {
      planSemanal: [
        {
          ...rutina.planSemanal[0],
          ejercicios: [{ ...ejercicio, series: 10000 }],
        },
      ],
    },
  ],
])
  test(`rechaza ${nombre}`, () =>
    assert.equal(
      rutinaSchema.safeParse({ ...rutina, ...cambio }).success,
      false,
    ));
test("actualización no admite rutas ni timestamps del cliente", () => {
  for (const id of ["../victima", "a/b"])
    assert.equal(
      escrituraRutinaSchema.safeParse({
        operacion: "actualizar",
        id,
        datos: { nombre: "nuevo" },
      }).success,
      false,
    );
  assert.equal(
    escrituraRutinaSchema.safeParse({
      operacion: "actualizar",
      id: "abc",
      datos: { creadoEn: 1 },
    }).success,
    false,
  );
});
test("búsqueda limita el coste y rechaza URL de destino arbitraria", () => {
  assert.equal(busquedaSchema.parse({ consulta: "  rice  " }).consulta, "rice");
  for (const datos of [
    { consulta: "a" },
    { consulta: "rice", tamanoPagina: 10000 },
    { consulta: "rice", url: "http://metadata.google.internal" },
  ])
    assert.equal(busquedaSchema.safeParse(datos).success, false);
});
test("valida respuesta externa antes de devolverla", () => {
  assert.equal(
    respuestaUsdaSchema.safeParse({ foods: [{ fdcId: 1 }] }).success,
    false,
  );
  assert.equal(respuestaUsdaSchema.safeParse({ foods: [] }).success, true);
});
