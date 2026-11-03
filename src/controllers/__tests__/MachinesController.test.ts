import { MaquinasController } from "@/controllers/MachinesController";
import type { Maquina } from "@/models/entities/Machine";
import {
  listarMaquinas,
  obtenerMaquina,
} from "@/models/repositories/machineRepository";
import { reconocerMaquina } from "@/services/ai/machineRecognition";

jest.mock("@/models/repositories/machineRepository", () => ({
  listarMaquinas: jest.fn(),
  obtenerMaquina: jest.fn(),
  obtenerUrlArchivo: jest.fn(),
}));
jest.mock("@/services/ai/machineRecognition", () => ({
  CONFIANZA_MINIMA: 0.8,
  reconocerMaquina: jest.fn(),
}));
jest.mock("@/models/repositories/wgerExerciseRepository", () => ({
  obtenerEjercicio: jest.fn(),
}));
jest.mock("@/models/repositories/exerciseDbRepository", () => ({
  obtenerAnimacionExacta: jest.fn(),
}));
jest.mock("@/models/repositories/localDemonstrationRepository", () => ({
  obtenerDemostracionesLocales: jest.fn(),
}));

function crearMaquina(id: string): Maquina {
  return {
    id,
    nombre: id,
    categoria: id,
    tipo: "maquina",
    orden: 1,
    descripcion: `Descripción de ${id}`,
    musculosPrincipales: [],
    musculosSecundarios: [],
    instrucciones: [`Instrucción de ${id}`],
    erroresComunes: [],
    prevencionLesiones: [],
    imagenPrincipal: `maquinas/${id}/principal.webp`,
    gifPrincipal: null,
    variantes: [],
    ejercicios: [],
    ejerciciosGif: [],
    wgerIds: [],
    workoutxIds: [],
  };
}

const prensa = crearMaquina("prensa-piernas");
const smith = crearMaquina("smith");

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(obtenerMaquina).mockImplementation(async (id) => {
    return [prensa, smith].find((maquina) => maquina.id === id) ?? null;
  });
});

it("mantiene la ficha reconocida separada de las alternativas", async () => {
  const cajaPrincipal = { x1: 0.1, y1: 0.2, x2: 0.5, y2: 0.8 };
  const cajaAlternativa = { x1: 0.6, y1: 0.1, x2: 0.9, y2: 0.7 };
  jest.mocked(reconocerMaquina).mockResolvedValue({
    maquinaId: prensa.id,
    confianza: 0.94,
    caja: cajaPrincipal,
    alternativas: [
      { maquinaId: smith.id, confianza: 0.3, caja: cajaAlternativa },
    ],
  });

  const resultado = await MaquinasController.reconocerDesdeFoto("foto.jpg");

  expect(reconocerMaquina).toHaveBeenCalledWith("foto.jpg");
  expect(resultado?.maquina).toBe(prensa);
  expect(resultado?.maquina.instrucciones).toEqual([
    "Instrucción de prensa-piernas",
  ]);
  expect(resultado?.requiereConfirmacion).toBe(false);
  expect(resultado?.caja).toEqual(cajaPrincipal);
  expect(resultado?.alternativas).toEqual([
    { maquina: smith, confianza: 0.3, caja: cajaAlternativa },
  ]);
  expect(listarMaquinas).not.toHaveBeenCalled();

  expect(
    MaquinasController.prepararObjetivoAR(prensa, resultado, "captura-1"),
  ).toMatchObject({
    capturaId: "captura-1",
    centroX: 0.3,
    centroY: 0.5,
    nombre: prensa.nombre,
  });
  expect(
    MaquinasController.prepararObjetivoAR(smith, resultado, "captura-1"),
  ).toMatchObject({
    capturaId: "captura-1",
    centroX: 0.75,
    nombre: smith.nombre,
  });
});

it("selección manual no reutiliza la caja de otra máquina", () => {
  const resultado = {
    maquina: prensa,
    confianza: 0.9,
    requiereConfirmacion: false,
    caja: { x1: 0.1, y1: 0.2, x2: 0.5, y2: 0.8 },
    alternativas: [],
  };
  expect(
    MaquinasController.prepararObjetivoAR(smith, resultado, "captura-1"),
  ).toMatchObject({
    capturaId: null,
    centroX: null,
    centroY: null,
    nombre: smith.nombre,
  });
  expect(
    MaquinasController.prepararObjetivoAR(null, resultado, "captura-1"),
  ).toBeNull();
});

it.each([
  [0.79, true],
  [0.8, false],
])("confianza %s: requiere confirmación = %s", async (confianza, confirmar) => {
  jest.mocked(reconocerMaquina).mockResolvedValue({
    maquinaId: prensa.id,
    confianza,
    alternativas: [],
  });

  const resultado = await MaquinasController.reconocerDesdeFoto("foto.jpg");

  expect(resultado?.requiereConfirmacion).toBe(confirmar);
  expect(resultado?.maquina.id).toBe(prensa.id);
});

it("sin reconocimiento no carga ni presenta una máquina arbitraria", async () => {
  jest.mocked(reconocerMaquina).mockResolvedValue(null);
  await expect(
    MaquinasController.reconocerDesdeFoto("foto.jpg"),
  ).resolves.toBeNull();
  expect(obtenerMaquina).not.toHaveBeenCalled();
});

it("una predicción sin ficha no se sustituye por otra máquina", async () => {
  jest.mocked(reconocerMaquina).mockResolvedValue({
    maquinaId: "inexistente",
    confianza: 0.99,
    alternativas: [{ maquinaId: smith.id, confianza: 0.2 }],
  });
  await expect(
    MaquinasController.reconocerDesdeFoto("foto.jpg"),
  ).resolves.toBeNull();
  expect(obtenerMaquina).toHaveBeenCalledTimes(1);
  expect(obtenerMaquina).toHaveBeenCalledWith("inexistente");
});
