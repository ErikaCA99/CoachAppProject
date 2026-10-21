import {
  avanzarHaciaCien,
  PORCENTAJE_MAXIMO_ESPERA,
  porcentajeSimulado,
} from "@/utils/loadingProgress";

describe("porcentajeSimulado", () => {
  it("empieza en 0", () => {
    expect(porcentajeSimulado(0)).toBe(0);
    expect(porcentajeSimulado(-50)).toBe(0);
  });

  it("es creciente y nunca pasa del tope de espera", () => {
    let anterior = 0;
    for (let ms = 0; ms <= 60_000; ms += 250) {
      const actual = porcentajeSimulado(ms);
      expect(actual).toBeGreaterThanOrEqual(anterior);
      expect(actual).toBeLessThanOrEqual(PORCENTAJE_MAXIMO_ESPERA);
      anterior = actual;
    }
  });

  it("avanza rápido al inicio y se frena después", () => {
    const primerSegundo = porcentajeSimulado(1000);
    const segundoSegundo = porcentajeSimulado(2000) - porcentajeSimulado(1000);
    expect(primerSegundo).toBeGreaterThan(segundoSegundo);
  });
});

describe("avanzarHaciaCien", () => {
  it("suma el paso y se detiene en 100", () => {
    expect(avanzarHaciaCien(47)).toBe(54);
    expect(avanzarHaciaCien(97)).toBe(100);
    expect(avanzarHaciaCien(100)).toBe(100);
  });
});
