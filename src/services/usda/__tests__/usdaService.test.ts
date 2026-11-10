import { invocarFuncion } from "@/services/firebase/functionsService";
import { buscarAlimentosUsda } from "../usdaService";

jest.mock("@/services/firebase/functionsService", () => ({
  invocarFuncion: jest.fn(),
}));

const alimento = {
  fdcId: 1,
  description: "Apples, raw, with skin",
  dataType: "SR Legacy",
  foodNutrients: [],
};

beforeEach(() => {
  jest.mocked(invocarFuncion).mockReset();
  jest.mocked(invocarFuncion).mockResolvedValue({ foods: [alimento] });
});

it("busca con un AbortSignal nativo de React Native (sin throwIfAborted)", async () => {
  const signal = { aborted: false } as AbortSignal;
  await expect(buscarAlimentosUsda("apple", { signal })).resolves.toHaveLength(
    1,
  );
});

it("rechaza con AbortError si la señal ya estaba cancelada", async () => {
  const signal = { aborted: true } as AbortSignal;
  await expect(buscarAlimentosUsda("apple", { signal })).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(invocarFuncion).not.toHaveBeenCalled();
});

it("descarta la respuesta si se cancela mientras la función responde", async () => {
  const abort = new AbortController();
  jest.mocked(invocarFuncion).mockImplementation(async () => {
    abort.abort();
    return { foods: [alimento] };
  });
  await expect(
    buscarAlimentosUsda("apple", { signal: abort.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
});
