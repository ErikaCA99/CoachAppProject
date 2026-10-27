import {
  validarDocumento,
  perfilPersistidoSchema,
  nutricionPersistidaSchema,
  rutinaPersistidaSchema,
} from "@/schemas/persisted.schema";
test("rechaza perfiles inválidos antes de que lleguen a reportes", () => {
  const validar = validarDocumento(perfilPersistidoSchema);
  expect(() =>
    validar({
      id: "a",
      nombre: "Ana",
      email: "a@example.test",
      objetivo: "administrador",
    }),
  ).toThrow("formato inválido");
});
test("acepta fechas pendientes y ambos formatos de nutrición", () => {
  expect(
    nutricionPersistidaSchema.parse({
      id: "a",
      usuarioId: "a",
      alimento: "Arroz",
      calorias: 100,
      creadoEn: null,
    }).creadoEn,
  ).toBeUndefined();
  expect(
    nutricionPersistidaSchema.safeParse({
      id: "a",
      usuarioId: "a",
      weight: 70,
      height: 170,
      bmi: 24.2,
      category: "NORMALIDAD",
      creadoEn: new Date(),
    }).success,
  ).toBe(true);
});
test("rechaza fechas falsas y planes anidados inválidos", () => {
  expect(
    nutricionPersistidaSchema.safeParse({
      id: "a",
      usuarioId: "a",
      alimento: "Arroz",
      calorias: 100,
      creadoEn: "ayer",
    }).success,
  ).toBe(false);
  expect(
    rutinaPersistidaSchema.safeParse({
      id: "a",
      usuarioId: "a",
      nombre: "Plan",
      tipo: "personalizada",
      diasPorSemana: 1,
      planSemanal: [123],
    }).success,
  ).toBe(false);
});
