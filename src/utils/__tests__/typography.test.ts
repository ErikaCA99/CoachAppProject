import {
  familiaPorPeso,
  pesoDeEstilo,
  separarPesoDeClases,
} from "../typography";

describe("familiaPorPeso", () => {
  it("elige la familia cargada más cercana", () => {
    expect(familiaPorPeso(100)).toBe("SplineSans_400Regular");
    expect(familiaPorPeso(400)).toBe("SplineSans_400Regular");
    expect(familiaPorPeso(500)).toBe("SplineSans_500Medium");
    expect(familiaPorPeso(600)).toBe("SplineSans_600SemiBold");
    expect(familiaPorPeso(700)).toBe("SplineSans_700Bold");
    expect(familiaPorPeso(900)).toBe("SplineSans_700Bold");
  });
});

describe("pesoDeEstilo", () => {
  it("entiende palabras y números", () => {
    expect(pesoDeEstilo(undefined)).toBeUndefined();
    expect(pesoDeEstilo("normal")).toBe(400);
    expect(pesoDeEstilo("bold")).toBe(700);
    expect(pesoDeEstilo("600")).toBe(600);
    expect(pesoDeEstilo(500)).toBe(500);
  });
});

describe("separarPesoDeClases", () => {
  it("quita la clase de peso y devuelve su valor", () => {
    expect(separarPesoDeClases("mt-2 text-sm font-bold text-primary")).toEqual({
      className: "mt-2 text-sm text-primary",
      peso: 700,
    });
  });

  it("sin clase de peso deja las clases iguales", () => {
    expect(separarPesoDeClases("mt-2 text-sm")).toEqual({
      className: "mt-2 text-sm",
      peso: undefined,
    });
  });

  it("resuelve clases condicionales ya unidas: gana la última", () => {
    expect(separarPesoDeClases("font-medium text-sm font-semibold").peso).toBe(
      600,
    );
  });

  it("no confunde font-display ni font-mono con un peso", () => {
    expect(separarPesoDeClases("font-display text-sm")).toEqual({
      className: "font-display text-sm",
      peso: undefined,
    });
  });

  it("acepta undefined y cadena vacía", () => {
    expect(separarPesoDeClases(undefined)).toEqual({
      className: undefined,
      peso: undefined,
    });
    expect(separarPesoDeClases("").peso).toBeUndefined();
  });
});
