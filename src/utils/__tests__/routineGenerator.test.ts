import {
  construirPlan,
  decidirClases,
  DIAS_POR_NIVEL,
  ESQUEMAS_CARGA,
  generarPlanHeuristico,
  indicePlantilla,
  PLANTILLAS_SEMANALES,
  repartirCantidad,
} from "@/utils/routineGenerator";

const OBJETIVOS = [
  "perder_peso",
  "ganar_masa",
  "mantenimiento",
  "resistencia",
] as const;
const NIVELES = ["principiante", "intermedio", "avanzado"] as const;

describe("contrato de clases con el modelo TFLite", () => {
  // Si estos arreglos cambian de orden, el modelo entrenado deja de ser válido.
  it("el orden de las plantillas coincide con ml/train_routine_model.py", () => {
    expect(PLANTILLAS_SEMANALES.map((p) => p.id)).toEqual([
      "3d_fuerza",
      "3d_cardio",
      "4d_fuerza",
      "4d_cardio",
      "5d_fuerza",
      "5d_cardio",
    ]);
  });

  it("el orden de los esquemas coincide con el modelo", () => {
    expect(ESQUEMAS_CARGA.map((e) => e.id)).toEqual([
      "metabolico",
      "hipertrofia",
      "general",
      "resistencia",
    ]);
  });

  it("cada plantilla tiene tantos bloques como días por semana", () => {
    for (const p of PLANTILLAS_SEMANALES) {
      expect(p.bloques).toHaveLength(p.diasPorSemana);
    }
  });
});

describe("indicePlantilla", () => {
  it.each([
    [3, false, 0],
    [3, true, 1],
    [4, false, 2],
    [4, true, 3],
    [5, false, 4],
    [5, true, 5],
  ])("%p días, cardio=%p → %p", (dias, cardio, esperado) => {
    expect(indicePlantilla(dias, cardio)).toBe(esperado);
  });

  it("acota los días a 3..5 y redondea", () => {
    expect(indicePlantilla(1, false)).toBe(0);
    expect(indicePlantilla(7, true)).toBe(5);
    expect(indicePlantilla(4.4, false)).toBe(2);
  });
});

describe("construirPlan", () => {
  it("combina plantilla y esquema", () => {
    const plan = construirPlan(2, 1);
    expect(plan.diasPorSemana).toBe(4);
    expect(plan.parametrosSerie).toEqual({
      series: 4,
      repeticiones: 9,
      descansoSegundos: 90,
    });
    expect(plan.bloques).toHaveLength(4);
  });

  it("devuelve una copia de los parámetros (no muta el esquema)", () => {
    const plan = construirPlan(0, 0);
    plan.parametrosSerie.series = 99;
    expect(ESQUEMAS_CARGA[0].parametros.series).toBe(3);
  });

  it("lanza si la clase está fuera de rango", () => {
    expect(() => construirPlan(-1, 0)).toThrow();
    expect(() => construirPlan(0, 4)).toThrow();
    expect(() => construirPlan(6, 0)).toThrow();
  });
});

describe("decidirClases", () => {
  it("perder peso (principiante) → 3 días con cardio y esquema metabólico", () => {
    expect(
      decidirClases({ objetivo: "perder_peso", nivel: "principiante" }),
    ).toEqual({ indicePlantilla: 1, indiceEsquema: 0 });
  });

  it("ganar masa avanzado no supera 5 días aunque tenga 6 disponibles", () => {
    expect(
      decidirClases({
        objetivo: "ganar_masa",
        nivel: "avanzado",
        diasDisponibles: 6,
      }),
    ).toEqual({ indicePlantilla: 4, indiceEsquema: 1 });
  });

  it("respeta los días disponibles si son menos que el máximo del nivel", () => {
    const { indicePlantilla: i } = decidirClases({
      objetivo: "mantenimiento",
      nivel: "avanzado",
      diasDisponibles: 3,
    });
    expect(PLANTILLAS_SEMANALES[i].diasPorSemana).toBe(3);
  });

  it("IMC ≥ 30 activa el énfasis en cardio aunque el objetivo no lo pida", () => {
    expect(
      decidirClases({
        objetivo: "mantenimiento",
        nivel: "intermedio",
        imc: 32,
      }),
    ).toEqual({ indicePlantilla: 3, indiceEsquema: 2 });
    expect(
      decidirClases({
        objetivo: "mantenimiento",
        nivel: "intermedio",
        imc: 29.9,
      }),
    ).toEqual({ indicePlantilla: 2, indiceEsquema: 2 });
  });

  it("adultos mayores (≥ 60) no reciben hipertrofia ni metabólico", () => {
    expect(
      decidirClases({ objetivo: "ganar_masa", nivel: "intermedio", edad: 65 })
        .indiceEsquema,
    ).toBe(2);
    expect(
      decidirClases({ objetivo: "perder_peso", nivel: "intermedio", edad: 65 })
        .indiceEsquema,
    ).toBe(2);
    expect(
      decidirClases({ objetivo: "resistencia", nivel: "intermedio", edad: 70 })
        .indiceEsquema,
    ).toBe(3);
  });

  it("menores de 16 no reciben hipertrofia", () => {
    expect(
      decidirClases({ objetivo: "ganar_masa", nivel: "principiante", edad: 15 })
        .indiceEsquema,
    ).toBe(2);
  });

  it("cualquier combinación de perfil produce clases válidas", () => {
    for (const objetivo of OBJETIVOS)
      for (const nivel of NIVELES)
        for (const edad of [undefined, 14, 15, 16, 30, 59, 60, 85])
          for (const imc of [undefined, 16, 24, 29.9, 30, 45])
            for (const diasDisponibles of [undefined, 1, 2, 3, 4, 5, 6, 7]) {
              const clases = decidirClases({
                objetivo,
                nivel,
                edad,
                imc,
                diasDisponibles,
              });
              expect(clases.indicePlantilla).toBeGreaterThanOrEqual(0);
              expect(clases.indicePlantilla).toBeLessThan(
                PLANTILLAS_SEMANALES.length,
              );
              expect(clases.indiceEsquema).toBeGreaterThanOrEqual(0);
              expect(clases.indiceEsquema).toBeLessThan(ESQUEMAS_CARGA.length);
              expect(() =>
                construirPlan(clases.indicePlantilla, clases.indiceEsquema),
              ).not.toThrow();
            }
  });
});

describe("generarPlanHeuristico", () => {
  it("usa los días por defecto del nivel", () => {
    for (const nivel of NIVELES) {
      expect(generarPlanHeuristico("mantenimiento", nivel).diasPorSemana).toBe(
        DIAS_POR_NIVEL[nivel],
      );
    }
  });
});

describe("repartirCantidad", () => {
  it("reparte lo más parejo posible", () => {
    expect(repartirCantidad(5, 2)).toEqual([3, 2]);
    expect(repartirCantidad(6, 3)).toEqual([2, 2, 2]);
    expect(repartirCantidad(4, 3)).toEqual([2, 1, 1]);
  });

  it("siempre suma el total", () => {
    for (let total = 0; total <= 12; total++)
      for (let partes = 1; partes <= 4; partes++) {
        expect(repartirCantidad(total, partes).reduce((a, b) => a + b, 0)).toBe(
          total,
        );
      }
  });
});
