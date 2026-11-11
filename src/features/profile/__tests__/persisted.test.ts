import { validarDocumento } from "@/core/validation/persisted.schema";
import { perfilPersistidoSchema } from "@/features/profile/model/schemas/persisted.schema";

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
