import {
  calcularIMC,
  clasificarIMC,
  ETIQUETAS_IMC,
  obtenerMensajeIMC,
  type BmiCategory,
} from "@/utils/imcCalculator";

describe("calcularIMC", () => {
  it("calcula peso / altura² con 1 decimal", () => {
    expect(calcularIMC(70, 175)).toBe(22.9);
    expect(calcularIMC(75, 178)).toBe(23.7);
    expect(calcularIMC(60, 165)).toBe(22);
  });

  it("acepta decimales en el peso", () => {
    expect(calcularIMC(82.5, 180)).toBe(25.5);
  });
});

describe("clasificarIMC (rangos OMS)", () => {
  const casos: [number, BmiCategory][] = [
    [16, "BAJO"],
    [18.4, "BAJO"],
    [18.5, "NORMALIDAD"],
    [24.9, "NORMALIDAD"],
    [25, "SOBREPESO"],
    [29.9, "SOBREPESO"],
    [30, "OBESIDAD"],
    [41, "OBESIDAD"],
  ];

  it.each(casos)("IMC %p → %s", (imc, categoria) => {
    expect(clasificarIMC(imc)).toBe(categoria);
  });
});

describe("etiquetas y mensajes", () => {
  const categorias: BmiCategory[] = [
    "BAJO",
    "NORMALIDAD",
    "SOBREPESO",
    "OBESIDAD",
  ];

  it("hay etiqueta y mensaje para cada categoría", () => {
    for (const categoria of categorias) {
      expect(ETIQUETAS_IMC[categoria]).toBeTruthy();
      expect(obtenerMensajeIMC(categoria).length).toBeGreaterThan(10);
    }
  });
});
