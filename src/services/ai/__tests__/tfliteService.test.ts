import { loadTensorflowModel } from "react-native-fast-tflite";
import { inferirRutina } from "@/services/ai/tfliteService";
import { NUM_FEATURES } from "@/services/ai/features";

jest.mock("react-native-fast-tflite", () => ({
  loadTensorflowModel: jest.fn(),
}));
jest.mock("../../../../assets/models/routine_recommender.tflite", () => 1);

describe("carga diferida de TensorFlow Lite", () => {
  it("no carga el módulo al abrir una pantalla ni ante entradas inválidas", async () => {
    expect(loadTensorflowModel).not.toHaveBeenCalled();
    await expect(inferirRutina(new Float32Array(0))).rejects.toThrow(
      "Entrada inválida",
    );
    expect(loadTensorflowModel).not.toHaveBeenCalled();
  });

  it("propaga el fallo nativo para activar el respaldo y permite reintentar", async () => {
    jest
      .mocked(loadTensorflowModel)
      .mockRejectedValue(new Error("Módulo no disponible"));
    await expect(inferirRutina(new Float32Array(NUM_FEATURES))).rejects.toThrow(
      "Módulo no disponible",
    );
    await expect(inferirRutina(new Float32Array(NUM_FEATURES))).rejects.toThrow(
      "Módulo no disponible",
    );
    expect(loadTensorflowModel).toHaveBeenCalledTimes(2);
  });

  it("rechaza probabilidades NaN aunque la dimensión de salida sea correcta", async () => {
    const valores = new Float32Array(10).fill(0.5);
    valores[0] = NaN;
    jest.mocked(loadTensorflowModel).mockResolvedValue({
      run: jest.fn().mockResolvedValue([valores.buffer]),
    } as never);
    await expect(inferirRutina(new Float32Array(NUM_FEATURES))).rejects.toThrow(
      "probabilidades inválidas",
    );
  });
});
