import { ReportesController } from "@/features/progress/controller/ReportsController";
import { listarProgreso } from "@/features/progress/model/repositories/progressRepository";
import { listarRegistrosNutricion } from "@/features/nutrition/model/repositories/nutritionRepository";
import { listarEntrenamientos } from "@/features/workout/model/repositories/workoutRepository";
jest.mock("@/features/profile/model/repositories/userRepository", () => ({
  obtenerPerfilUsuario: jest.fn(async () => null),
}));
jest.mock("@/features/progress/model/repositories/progressRepository", () => ({
  listarProgreso: jest.fn(async () => []),
}));
jest.mock(
  "@/features/nutrition/model/repositories/nutritionRepository",
  () => ({
    listarRegistrosNutricion: jest.fn(async () => []),
  }),
);
jest.mock("@/features/workout/model/repositories/workoutRepository", () => ({
  listarEntrenamientos: jest.fn(async () => []),
}));
jest.mock("@/features/progress/api/pdfService", () => ({
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
