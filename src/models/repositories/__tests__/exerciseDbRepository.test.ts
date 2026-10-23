import { obtenerAnimacionExacta } from "@/models/repositories/exerciseDbRepository";
import { buscarAnimacionesExerciseDb } from "@/services/exercisedb/exerciseDbService";

jest.mock("@/services/exercisedb/exerciseDbService", () => ({
  buscarAnimacionesExerciseDb: jest.fn(),
}));

const buscar = jest.mocked(buscarAnimacionesExerciseDb);
const press = {
  exerciseId: "EIeI8Vf",
  name: "barbell bench press",
  gifUrl: "https://static.exercisedb.dev/media/EIeI8Vf.gif",
};

beforeEach(() => jest.resetAllMocks());

it("selecciona el press plano aunque la API también devuelva una variante inclinada", async () => {
  buscar.mockResolvedValue([
    { ...press, exerciseId: "incline", name: "barbell incline bench press" },
    press,
  ]);
  await expect(
    obtenerAnimacionExacta("Barbell Bench Press", new AbortController().signal),
  ).resolves.toEqual({
    id: press.exerciseId,
    nombre: press.name,
    url: press.gifUrl,
  });
});

it("no sustituye un ejercicio por una variante similar", async () => {
  buscar.mockResolvedValue([{ ...press, name: "barbell incline bench press" }]);
  await expect(
    obtenerAnimacionExacta("barbell bench press", new AbortController().signal),
  ).resolves.toBeNull();
});

it("rechaza un nombre ambiguo con varios identificadores", async () => {
  buscar.mockResolvedValue([press, { ...press, exerciseId: "otro" }]);
  await expect(
    obtenerAnimacionExacta(press.name, new AbortController().signal),
  ).resolves.toBeNull();
});

it("no consulta la API cuando falta el nombre original", async () => {
  await expect(
    obtenerAnimacionExacta("  ", new AbortController().signal),
  ).resolves.toBeNull();
  expect(buscar).not.toHaveBeenCalled();
});
