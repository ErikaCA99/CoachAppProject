import {
  construirFeatures,
  NOMBRES_FEATURES,
  NUM_FEATURES,
  VALORES_POR_DEFECTO,
} from "@/services/ai/features";

describe("contrato de entrada del modelo (VERSION_FEATURES = 1)", () => {
  it("define 10 features en el orden del script de entrenamiento", () => {
    expect(NUM_FEATURES).toBe(10);
    expect([...NOMBRES_FEATURES]).toEqual([
      "edad",
      "genero_masculino",
      "genero_femenino",
      "imc",
      "nivel",
      "dias_disponibles",
      "obj_perder_peso",
      "obj_ganar_masa",
      "obj_mantenimiento",
      "obj_resistencia",
    ]);
  });
});

describe("construirFeatures", () => {
  it("codifica un perfil completo", () => {
    const v = construirFeatures({
      genero: "femenino",
      edad: 28,
      altura: 165,
      pesoActual: 60,
      diasDisponibles: 4,
      objetivo: "ganar_masa",
      nivel: "intermedio",
    });
    expect(v).toBeInstanceOf(Float32Array);
    expect(Array.from(v)).toEqual([28, 0, 1, 22, 1, 4, 0, 1, 0, 0]);
  });

  it("usa valores por defecto cuando faltan datos del perfil", () => {
    const v = construirFeatures({
      objetivo: "mantenimiento",
      nivel: "principiante",
    });
    expect(Array.from(v)).toEqual([
      VALORES_POR_DEFECTO.edad,
      0,
      0,
      VALORES_POR_DEFECTO.imc,
      0,
      3, // días por defecto del nivel principiante
      0,
      0,
      1,
      0,
    ]);
  });

  it("sin género no activa ninguna de las dos columnas", () => {
    const v = construirFeatures({
      objetivo: "resistencia",
      nivel: "avanzado",
    });
    expect(v[1]).toBe(0);
    expect(v[2]).toBe(0);
    expect(v[4]).toBe(2); // avanzado
    expect(v[9]).toBe(1); // obj_resistencia
  });

  it("el objetivo es one-hot (exactamente una columna activa)", () => {
    for (const objetivo of [
      "perder_peso",
      "ganar_masa",
      "mantenimiento",
      "resistencia",
    ] as const) {
      const v = construirFeatures({ objetivo, nivel: "intermedio" });
      const suma = v[6] + v[7] + v[8] + v[9];
      expect(suma).toBe(1);
    }
  });
});
