import {
  calcularRacha,
  calcularResumenEntrenamientos,
  formatearFechaISO,
} from "@/utils/entrenamientoStats";

// Octubre 2026: lunes 12, miércoles 14, domingo 18.
const MIERCOLES = new Date(2026, 9, 14, 12, 0, 0);
const DOMINGO = new Date(2026, 9, 18, 12, 0, 0);

describe("formatearFechaISO", () => {
  it("usa componentes locales con ceros a la izquierda", () => {
    expect(formatearFechaISO(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatearFechaISO(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("calcularRacha", () => {
  it("es 0 sin entrenamientos", () => {
    expect(calcularRacha(new Set(), MIERCOLES)).toBe(0);
  });

  it("cuenta días consecutivos incluyendo hoy", () => {
    const fechas = new Set(["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(calcularRacha(fechas, MIERCOLES)).toBe(3);
  });

  it("no se rompe si hoy todavía no entrenó pero ayer sí", () => {
    const fechas = new Set(["2026-10-12", "2026-10-13"]);
    expect(calcularRacha(fechas, MIERCOLES)).toBe(2);
  });

  it("se corta cuando falta un día", () => {
    const fechas = new Set(["2026-10-10", "2026-10-13"]);
    expect(calcularRacha(fechas, MIERCOLES)).toBe(1);
  });

  it("es 0 si el último entrenamiento fue hace 2 días o más", () => {
    expect(calcularRacha(new Set(["2026-10-12"]), MIERCOLES)).toBe(0);
  });
});

describe("calcularResumenEntrenamientos", () => {
  it("arma la semana de lunes a domingo", () => {
    const r = calcularResumenEntrenamientos(
      ["2026-10-12", "2026-10-13"],
      MIERCOLES,
    );
    expect(r.dias.map((d) => d.etiqueta)).toEqual([
      "L",
      "M",
      "X",
      "J",
      "V",
      "S",
      "D",
    ]);
    expect(r.dias[0].fecha).toBe("2026-10-12");
    expect(r.dias[6].fecha).toBe("2026-10-18");
  });

  it("marca hoy, futuro y completados", () => {
    const r = calcularResumenEntrenamientos(
      ["2026-10-12", "2026-10-13"],
      MIERCOLES,
    );
    expect(r.dias.filter((d) => d.esHoy).map((d) => d.fecha)).toEqual([
      "2026-10-14",
    ]);
    expect(r.dias.filter((d) => d.esFuturo)).toHaveLength(4);
    expect(r.dias.filter((d) => d.completado)).toHaveLength(2);
    expect(r.completadosSemana).toBe(2);
    expect(r.totalSemana).toBe(7);
  });

  it("el domingo cierra la semana que empezó el lunes anterior", () => {
    const r = calcularResumenEntrenamientos(
      ["2026-10-12", "2026-10-13", "2026-10-17", "2026-10-18"],
      DOMINGO,
    );
    expect(r.dias[6]).toMatchObject({
      etiqueta: "D",
      numeroDia: 18,
      esHoy: true,
    });
    expect(r.completadosSemana).toBe(4);
    expect(r.rachaActual).toBe(2);
    expect(r.totalEntrenos).toBe(4);
  });

  it("no cuenta entrenamientos de otras semanas en completadosSemana", () => {
    const r = calcularResumenEntrenamientos(
      ["2026-10-05", "2026-10-06"],
      MIERCOLES,
    );
    expect(r.completadosSemana).toBe(0);
    expect(r.totalEntrenos).toBe(2);
  });
});
