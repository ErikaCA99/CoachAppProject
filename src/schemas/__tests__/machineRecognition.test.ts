import { respuestaReconocimientoSchema } from "@/schemas/machineRecognition.schema";

describe("geometría de reconocimiento recibida del backend", () => {
  it("conserva las coordenadas normalizadas de la caja", () => {
    const sugerencia = {
      maquinaId: "smith",
      confianza: 0.9,
      caja: { x1: 0, y1: 0.1, x2: 1, y2: 0.8 },
    };
    expect(
      respuestaReconocimientoSchema.parse({ sugerencias: [sugerencia] })
        .sugerencias[0],
    ).toEqual(sugerencia);
  });

  it.each([
    { x1: -0.1, y1: 0, x2: 1, y2: 1 },
    { x1: 0, y1: 0, x2: 640, y2: 480 },
    { x1: 0.8, y1: 0, x2: 0.2, y2: 1 },
    { x1: 0, y1: 0.5, x2: 1, y2: 0.5 },
    { x1: NaN, y1: 0, x2: 1, y2: 1 },
  ])("rechaza cajas inválidas: %o", (caja) => {
    expect(
      respuestaReconocimientoSchema.safeParse({
        sugerencias: [
          {
            maquinaId: "smith",
            confianza: 0.9,
            caja,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("acepta backend anterior sin coordenadas para colocación manual", () => {
    expect(
      respuestaReconocimientoSchema.safeParse({
        sugerencias: [
          {
            maquinaId: "smith",
            confianza: 0.9,
          },
        ],
      }).success,
    ).toBe(true);
  });
});
