import { nutricionPersistidaSchema } from "@/features/nutrition/model/schemas/persisted.schema";

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
test("rechaza fechas falsas", () => {
  expect(
    nutricionPersistidaSchema.safeParse({
      id: "a",
      usuarioId: "a",
      alimento: "Arroz",
      calorias: 100,
      creadoEn: "ayer",
    }).success,
  ).toBe(false);
});
