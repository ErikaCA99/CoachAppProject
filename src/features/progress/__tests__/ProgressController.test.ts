import { ProgresoController } from "@/features/progress/controller/ProgressController";
import {
  actualizarProgreso,
  obtenerProgreso,
} from "@/features/progress/model/repositories/progressRepository";
import { calcularIMC } from "@/features/nutrition/model/rules/bmiCalculator";

jest.mock("@/features/progress/model/repositories/progressRepository", () => ({
  obtenerProgreso: jest.fn(),
  actualizarProgreso: jest.fn(),
}));
jest.mock("@/features/profile/model/repositories/userRepository", () => ({
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
