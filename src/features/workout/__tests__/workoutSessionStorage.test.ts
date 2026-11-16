import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  borrarSesionEnCurso,
  esSesionGuardada,
  guardarSesionEnCurso,
  leerSesionEnCurso,
  sesionCompatible,
  type SesionGuardada,
} from "@/features/workout/model/repositories/workoutSessionStorage";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const HOY = new Date(2026, 9, 27, 10, 0, 0);
const EJERCICIOS = [
  { series: 3, descansoSegundos: 60 },
  { series: 2, descansoSegundos: 45 },
];

function guardada(parcial: Partial<SesionGuardada> = {}): SesionGuardada {
  return {
    uid: "u1",
    rutinaId: "r1",
    numeroDia: 2,
    fecha: "2026-10-27",
    inicioMs: 1_000,
    sesion: {
      ejercicios: EJERCICIOS,
      indice: 1,
      serie: 2,
      descansoTerminaEn: null,
      omitidos: [],
      terminado: false,
    },
    ...parcial,
  };
}

const contexto = {
  uid: "u1",
  rutinaId: "r1",
  numeroDia: 2,
  ejercicios: EJERCICIOS,
  hoy: HOY,
};

describe("esSesionGuardada", () => {
  it("acepta una sesión bien formada", () => {
    expect(esSesionGuardada(guardada())).toBe(true);
  });

  it("rechaza valores corruptos o incompletos", () => {
    expect(esSesionGuardada(null)).toBe(false);
    expect(esSesionGuardada("texto")).toBe(false);
    expect(esSesionGuardada({ ...guardada(), numeroDia: "2" })).toBe(false);
    expect(
      esSesionGuardada({
        ...guardada(),
        sesion: { ...guardada().sesion, indice: "x" },
      }),
    ).toBe(false);
    expect(
      esSesionGuardada({
        ...guardada(),
        sesion: { ...guardada().sesion, ejercicios: [{ series: 3 }] },
      }),
    ).toBe(false);
  });
});

describe("sesionCompatible", () => {
  it("acepta la sesión de hoy del mismo día de la misma rutina", () => {
    expect(sesionCompatible(guardada(), contexto)).toBe(true);
  });

  it("rechaza otro usuario, otra rutina u otro día", () => {
    expect(sesionCompatible(guardada({ uid: "u2" }), contexto)).toBe(false);
    expect(sesionCompatible(guardada({ rutinaId: "r2" }), contexto)).toBe(
      false,
    );
    expect(sesionCompatible(guardada({ numeroDia: 3 }), contexto)).toBe(false);
  });

  it("rechaza una sesión de otro día del calendario", () => {
    expect(sesionCompatible(guardada({ fecha: "2026-10-26" }), contexto)).toBe(
      false,
    );
  });

  it("rechaza la sesión si la rutina cambió sus ejercicios", () => {
    expect(
      sesionCompatible(guardada(), {
        ...contexto,
        ejercicios: [{ series: 4, descansoSegundos: 60 }, EJERCICIOS[1]],
      }),
    ).toBe(false);
    expect(
      sesionCompatible(guardada(), {
        ...contexto,
        ejercicios: [EJERCICIOS[0]],
      }),
    ).toBe(false);
  });

  it("rechaza un avance fuera de rango", () => {
    const rota = guardada();
    rota.sesion = { ...rota.sesion, indice: 9 };
    expect(sesionCompatible(rota, contexto)).toBe(false);
  });
});

describe("persistencia de la sesión en curso", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("guarda y lee la sesión del mismo usuario y día", async () => {
    await guardarSesionEnCurso(guardada());
    expect(await leerSesionEnCurso("u1", HOY)).toEqual(guardada());
  });

  it("no devuelve la sesión de otro usuario ni de otro día", async () => {
    await guardarSesionEnCurso(guardada());
    expect(await leerSesionEnCurso("otro", HOY)).toBeNull();
    expect(await leerSesionEnCurso("u1", new Date(2026, 9, 28))).toBeNull();
  });

  it("ignora datos corruptos", async () => {
    await AsyncStorage.setItem(
      "coachapp:sesion-entrenamiento:v1",
      "{no es json",
    );
    expect(await leerSesionEnCurso("u1", HOY)).toBeNull();
  });

  it("borra la sesión guardada", async () => {
    await guardarSesionEnCurso(guardada());
    await borrarSesionEnCurso();
    expect(await leerSesionEnCurso("u1", HOY)).toBeNull();
  });
});
