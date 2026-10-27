import { ReportesController } from "@/controllers/ReportsController";
import { listarProgreso } from "@/models/repositories/progressRepository";
import { listarRegistrosNutricion } from "@/models/repositories/nutritionRepository";
import { listarEntrenamientos } from "@/models/repositories/workoutRepository";
jest.mock("@/models/repositories/userRepository", () => ({
  obtenerPerfilUsuario: jest.fn(async () => null),
}));
jest.mock("@/models/repositories/progressRepository", () => ({
  listarProgreso: jest.fn(async () => []),
}));
jest.mock("@/models/repositories/nutritionRepository", () => ({
  listarRegistrosNutricion: jest.fn(async () => []),
}));
jest.mock("@/models/repositories/workoutRepository", () => ({
  listarEntrenamientos: jest.fn(async () => []),
}));
jest.mock("@/services/reports/pdfService", () => ({
  compartirPdf: jest.fn(),
  generarPdfDesdeHtml: jest.fn(),
}));
test("consulta solo el período solicitado, inclusive días locales", async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 26, 12));
  await ReportesController.calcularResumen("alice", 7);
  const intervalo = {
    desde: new Date(2026, 9, 20),
    hasta: new Date(2026, 9, 26, 23, 59, 59, 999),
  };
  expect(listarProgreso).toHaveBeenCalledWith("alice", intervalo);
  expect(listarRegistrosNutricion).toHaveBeenCalledWith("alice", intervalo);
  expect(listarEntrenamientos).toHaveBeenCalledWith("alice", {
    desde: "2026-10-20",
    hasta: "2026-10-26",
  });
  jest.useRealTimers();
});
