import { obtenerDemostracionesLocales } from "@/models/repositories/localDemonstrationRepository";
import { ETIQUETAS_MAQUINAS } from "@/services/ai/machineLabels";

describe("demostraciones locales por máquina", () => {
  it.each([
    ["remo-sentado", 1],
    ["jalon-pecho", 2],
    ["press-hombro", 1],
    ["banco-predicador", 1],
    ["pantorrillas", 1],
    ["smith", 1],
    ["prensa-piernas", 1],
    ["estacion-poleas", 4],
  ])("%s tiene sus variantes explícitas", (maquinaId, cantidad) => {
    expect(ETIQUETAS_MAQUINAS).toContain(maquinaId);
    const demostraciones = obtenerDemostracionesLocales(String(maquinaId));
    expect(demostraciones).toHaveLength(Number(cantidad));
    for (const demostracion of demostraciones) {
      expect(demostracion.recurso).toBeTruthy();
      expect(demostracion.vistaEstatica).toBeTruthy();
      expect(demostracion.indicacion.length).toBeGreaterThan(0);
    }
  });

  it("no confunde ejercicios de polea con máquinas abdominales o de rotación", () => {
    expect(obtenerDemostracionesLocales("abdominal")).toEqual([]);
    expect(obtenerDemostracionesLocales("torso-rotatorio")).toEqual([]);
    expect(obtenerDemostracionesLocales("inexistente")).toEqual([]);
    expect(obtenerDemostracionesLocales("toString")).toEqual([]);
    expect(obtenerDemostracionesLocales("__proto__")).toEqual([]);
  });

  it("mantiene identificadores únicos para cambiar de variante sin conservar reproducción", () => {
    const demostraciones = ETIQUETAS_MAQUINAS.flatMap(
      obtenerDemostracionesLocales,
    );
    expect(demostraciones).toHaveLength(12);
    expect(new Set(demostraciones.map((item) => item.id)).size).toBe(12);
  });
});
