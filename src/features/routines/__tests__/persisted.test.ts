import { rutinaPersistidaSchema } from "@/features/routines/model/schemas/persisted.schema";

test("rechaza planes anidados inválidos", () => {
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
