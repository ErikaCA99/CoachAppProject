import { RutinasController } from "@/controllers/RoutinesController";
import { EjerciciosWgerController } from "@/controllers/WgerExercisesController";
import {
  guardarRutina,
  obtenerRutina,
} from "@/models/repositories/routineRepository";
import {
  actualizarPerfilUsuario,
  obtenerPerfilUsuario,
} from "@/models/repositories/userRepository";
import { planificarRutina } from "@/services/ai/routinePlanner";

jest.mock("@/models/repositories/routineRepository", () => ({
  guardarRutina: jest.fn(),
  obtenerRutina: jest.fn(),
}));
jest.mock("@/models/repositories/userRepository", () => ({
  actualizarPerfilUsuario: jest.fn(),
  obtenerPerfilUsuario: jest.fn(),
}));
jest.mock("@/services/ai/routinePlanner", () => ({
  planificarRutina: jest.fn(),
}));
jest.mock("@/controllers/WgerExercisesController", () => ({
  EjerciciosWgerController: {
    listar: jest.fn(),
    obtenerImagenRespaldo: jest.fn(),
  },
}));

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(obtenerPerfilUsuario).mockResolvedValue({
    id: "u1",
    nombre: "Ana",
    email: "ana@example.com",
    rutinaActivaId: "anterior",
  });
  jest.mocked(planificarRutina).mockResolvedValue({
    origen: "heuristica",
    plan: {
      diasPorSemana: 1,
      parametrosSerie: { series: 3, repeticiones: 10, descansoSegundos: 60 },
      bloques: [
        { enfoque: "Torso", cantidadEjercicios: 1, categoriasIds: [11] },
      ],
    },
  });
  jest.mocked(EjerciciosWgerController.listar).mockResolvedValue({
    total: 1,
    siguienteOffset: null,
    items: [
      { id: 1, nombre: "Press", imagenUrl: "https://example.com/press.jpg" },
    ],
  } as Awaited<ReturnType<typeof EjerciciosWgerController.listar>>);
});

it("genera una vista previa sin guardar ni activar nada", async () => {
  const rutina = await RutinasController.generarVistaPrevia(
    "u1",
    "ganar_masa",
    "intermedio",
  );
  expect(rutina.planSemanal[0].ejercicios).toHaveLength(1);
  expect(guardarRutina).not.toHaveBeenCalled();
  expect(actualizarPerfilUsuario).not.toHaveBeenCalled();
});

it("genera con AbortSignal nativo sin throwIfAborted", async () => {
  const signal = { aborted: false } as AbortSignal;
  const rutina = await RutinasController.generarVistaPrevia(
    "u1",
    "ganar_masa",
    "intermedio",
    signal,
  );
  expect(rutina.planSemanal[0].ejercicios).toHaveLength(1);
});

it("rechaza una señal nativa cancelada antes de consultar datos", async () => {
  const signal = { aborted: true } as AbortSignal;
  await expect(
    RutinasController.generarVistaPrevia(
      "u1",
      "ganar_masa",
      "intermedio",
      signal,
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(obtenerPerfilUsuario).not.toHaveBeenCalled();
});

it("cancelar aborta la solicitud de ejercicios y no persiste resultados tardíos", async () => {
  const abort = new AbortController();
  jest
    .mocked(EjerciciosWgerController.listar)
    .mockImplementation(async ({ signal }) => {
      expect(signal).toBe(abort.signal);
      abort.abort();
      return { total: 1, siguienteOffset: null, items: [] };
    });
  await expect(
    RutinasController.generarVistaPrevia(
      "u1",
      "ganar_masa",
      "intermedio",
      abort.signal,
    ),
  ).rejects.toThrow();
  expect(guardarRutina).not.toHaveBeenCalled();
  expect(actualizarPerfilUsuario).not.toHaveBeenCalled();
});

it("guardar en historial no cambia la rutina activa", async () => {
  const rutina = await RutinasController.generarVistaPrevia(
    "u1",
    "ganar_masa",
    "intermedio",
  );
  jest.mocked(guardarRutina).mockResolvedValue("nueva");
  await expect(
    RutinasController.guardarVistaPrevia("u1", rutina),
  ).resolves.toBe("nueva");
  expect(actualizarPerfilUsuario).not.toHaveBeenCalled();
});

it("activar recuerda la rutina anterior para poder deshacer", async () => {
  jest
    .mocked(obtenerRutina)
    .mockImplementation(
      async (_, id) =>
        ({ id, nombre: id === "anterior" ? "Fuerza 5x5" : "Nueva" }) as Awaited<
          ReturnType<typeof obtenerRutina>
        >,
    );
  const anterior = await RutinasController.activarConAnterior("u1", "nueva");
  expect(anterior?.id).toBe("anterior");
  expect(actualizarPerfilUsuario).toHaveBeenCalledWith("u1", {
    rutinaActivaId: "nueva",
  });
});

it("deshacer restaura la anterior sin eliminar la nueva", async () => {
  jest.mocked(obtenerPerfilUsuario).mockResolvedValue({
    id: "u1",
    nombre: "Ana",
    email: "ana@example.com",
    rutinaActivaId: "nueva",
  });
  jest
    .mocked(obtenerRutina)
    .mockResolvedValue({ id: "anterior" } as Awaited<
      ReturnType<typeof obtenerRutina>
    >);
  await RutinasController.deshacerActivacion("u1", "nueva", "anterior");
  expect(actualizarPerfilUsuario).toHaveBeenCalledWith("u1", {
    rutinaActivaId: "anterior",
  });
});

it("deshacer respeta una selección posterior del usuario", async () => {
  await expect(
    RutinasController.deshacerActivacion("u1", "nueva", "anterior"),
  ).rejects.toThrow("Tu rutina activa cambió");
  expect(actualizarPerfilUsuario).not.toHaveBeenCalled();
});
