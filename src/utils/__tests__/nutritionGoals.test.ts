import {
  calcularMetasNutricionales,
  calcularTMB,
  factorActividad,
  METAS_POR_DEFECTO,
} from "@/utils/nutritionGoals";

describe("factorActividad", () => {
  it.each([
    [undefined, 1.2],
    [0, 1.2],
    [1, 1.2],
    [2, 1.375],
    [3, 1.375],
    [4, 1.55],
    [5, 1.55],
    [6, 1.725],
    [7, 1.725],
  ])("%p días/semana → %p", (dias, factor) => {
    expect(factorActividad(dias)).toBe(factor);
  });
});

describe("calcularTMB (Mifflin-St Jeor)", () => {
  it("hombre: 10·peso + 6,25·altura − 5·edad + 5", () => {
    expect(
      calcularTMB({ pesoKg: 75, alturaCm: 178, edad: 25, genero: "masculino" }),
    ).toBe(1742.5);
  });

  it("mujer: constante −161", () => {
    expect(
      calcularTMB({ pesoKg: 60, alturaCm: 165, edad: 30, genero: "femenino" }),
    ).toBe(1320.25);
  });

  it("sin dato de género: constante promedio −78", () => {
    const base = { pesoKg: 70, alturaCm: 170, edad: 30 };
    expect(calcularTMB(base)).toBe(1534.5);
  });
});

describe("calcularMetasNutricionales", () => {
  it("sin perfil o con datos incompletos devuelve las metas por defecto", () => {
    const sinPerfil = calcularMetasNutricionales(null);
    expect(sinPerfil.personalizada).toBe(false);
    expect(sinPerfil.metas).toEqual(METAS_POR_DEFECTO);
    expect(sinPerfil.faltantes).toEqual(["peso", "altura", "edad"]);

    const parcial = calcularMetasNutricionales({ pesoActual: 70 });
    expect(parcial.personalizada).toBe(false);
    expect(parcial.faltantes).toEqual(["altura", "edad"]);
  });

  it("hombre de 25 años, 75 kg, 178 cm, 4 días, ganar masa → 3001 kcal", () => {
    const r = calcularMetasNutricionales({
      genero: "masculino",
      edad: 25,
      pesoActual: 75,
      altura: 178,
      diasDisponibles: 4,
      objetivo: "ganar_masa",
    });
    expect(r.personalizada).toBe(true);
    expect(r.faltantes).toEqual([]);
    expect(r.detalle).toEqual({
      tmb: 1743,
      factorActividad: 1.55,
      gastoTotal: 2701,
      ajusteObjetivo: 300,
    });
    expect(r.metas.calorias).toBe(3001);
    expect(r.metas.proteinas).toBe(135); // 1,8 g/kg
    expect(r.metas.grasas).toBe(83); // 25 % de las kcal
  });

  it("perder peso aplica un déficit de 500 kcal", () => {
    const r = calcularMetasNutricionales({
      genero: "femenino",
      edad: 30,
      pesoActual: 60,
      altura: 165,
      diasDisponibles: 3,
      objetivo: "perder_peso",
    });
    // TMB 1320,25 × 1,375 = 1815,3 − 500
    expect(r.metas.calorias).toBe(1315);
    expect(r.metas.proteinas).toBe(120); // 2,0 g/kg
  });

  it("nunca baja del piso calórico de seguridad", () => {
    const mujer = calcularMetasNutricionales({
      genero: "femenino",
      edad: 50,
      pesoActual: 45,
      altura: 150,
      diasDisponibles: 0,
      objetivo: "perder_peso",
    });
    expect(mujer.metas.calorias).toBe(1200);

    const hombre = calcularMetasNutricionales({
      genero: "masculino",
      edad: 60,
      pesoActual: 45,
      altura: 150,
      diasDisponibles: 0,
      objetivo: "perder_peso",
    });
    expect(hombre.metas.calorias).toBe(1500);
  });

  it("los macros nunca son negativos y reconstruyen las kcal (±10)", () => {
    const objetivos = [
      "perder_peso",
      "ganar_masa",
      "mantenimiento",
      "resistencia",
    ] as const;
    for (const objetivo of objetivos) {
      const { metas } = calcularMetasNutricionales({
        genero: "femenino",
        edad: 35,
        pesoActual: 80,
        altura: 175,
        diasDisponibles: 5,
        objetivo,
      });
      expect(metas.proteinas).toBeGreaterThan(0);
      expect(metas.carbohidratos).toBeGreaterThanOrEqual(0);
      expect(metas.grasas).toBeGreaterThan(0);
      const kcal =
        metas.proteinas * 4 + metas.carbohidratos * 4 + metas.grasas * 9;
      expect(Math.abs(kcal - metas.calorias)).toBeLessThanOrEqual(10);
    }
  });
});
