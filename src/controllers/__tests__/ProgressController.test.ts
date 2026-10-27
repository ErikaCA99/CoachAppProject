import { ProgresoController } from "@/controllers/ProgressController";
import {
  actualizarProgreso,
  obtenerProgreso,
} from "@/models/repositories/progressRepository";
import { calcularIMC } from "@/utils/bmiCalculator";

jest.mock("@/models/repositories/progressRepository", () => ({
  obtenerProgreso: jest.fn(),
  actualizarProgreso: jest.fn(),
}));
jest.mock("@/models/repositories/userRepository", () => ({
  actualizarPerfilUsuario: jest.fn(),
}));

describe("actualización parcial de progreso", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(obtenerProgreso).mockResolvedValue({
      id: "registro",
      usuarioId: "usuario",
      peso: 80,
      altura: 175,
      imc: 26.1,
    });
  });

  it("recalcula IMC al cambiar solo el peso", async () => {
    await ProgresoController.actualizar("usuario", "registro", { peso: 75 });
    expect(actualizarProgreso).toHaveBeenCalledWith("usuario", "registro", {
      peso: 75,
      imc: calcularIMC(75, 175),
    });
  });

  it("recalcula IMC al cambiar solo la altura", async () => {
    await ProgresoController.actualizar("usuario", "registro", { altura: 180 });
    expect(actualizarProgreso).toHaveBeenCalledWith("usuario", "registro", {
      altura: 180,
      imc: calcularIMC(80, 180),
    });
  });

  it("no recrea un registro eliminado", async () => {
    jest.mocked(obtenerProgreso).mockResolvedValue(null);
    await expect(
      ProgresoController.actualizar("usuario", "registro", { peso: 75 }),
    ).rejects.toThrow("ya no existe");
    expect(actualizarProgreso).not.toHaveBeenCalled();
  });
});
