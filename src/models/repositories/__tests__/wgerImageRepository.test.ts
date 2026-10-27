import { obtenerImagenRespaldoWger } from "@/models/repositories/wgerImageRepository";
import { listar } from "@/services/firebase/firestoreService";

jest.mock("@/services/firebase/firestoreService", () => ({
  listar: jest.fn(),
}));

const listarMock = listar as unknown as jest.Mock;

it("indexa por id de wger, valida y expone la atribución de Gym Visual", async () => {
  listarMock.mockResolvedValue([
    {
      id: "186",
      wgerId: 186,
      nombreWger: "Decline Bench Press Dumbbell",
      imagenes: [
        "ejercicios/Decline_Dumbbell_Bench_Press/0.webp",
        "ejercicios/Decline_Dumbbell_Bench_Press/1.webp",
      ],
      pasos: ["Siéntate en el banco.", "Baja la mancuerna al pecho."],
      gif: "ejercicios/gymvisual/0301.gif",
      miniatura: "ejercicios/gymvisual/0301.webp",
      fuentes: { gymVisual: { atribucion: "© Gym visual" } },
    },
    { id: "roto", wgerId: "no-es-numero" },
  ]);

  const imagen = await obtenerImagenRespaldoWger(186);
  expect(imagen?.imagenes).toHaveLength(2);
  expect(imagen?.pasos).toHaveLength(2);
  expect(imagen?.gif).toBe("ejercicios/gymvisual/0301.gif");
  expect(imagen?.atribucionGymVisual).toBe("© Gym visual");
  await expect(obtenerImagenRespaldoWger(999)).resolves.toBeNull();
  expect(listarMock).toHaveBeenCalledTimes(1); // se descarga una sola vez
});
