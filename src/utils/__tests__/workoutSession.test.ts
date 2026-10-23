import {
  completarSerie,
  crearSesion,
  ejerciciosRealizados,
  formatearTemporizador,
  progresoEjercicio,
  saltarEjercicio,
  segundosDescanso,
  seriesRealizadas,
  terminarDescanso,
} from "@/utils/workoutSession";

const AHORA = 1_000_000;
const DOS_EJERCICIOS = [
  { series: 2, descansoSegundos: 60 },
  { series: 1, descansoSegundos: 45 },
];

describe("crearSesion", () => {
  it("empieza en el primer ejercicio, serie 1, sin descanso", () => {
    const s = crearSesion(DOS_EJERCICIOS);
    expect(s).toMatchObject({
      indice: 0,
      serie: 1,
      descansoTerminaEn: null,
      terminado: false,
    });
  });

  it("un día sin ejercicios nace terminado", () => {
    expect(crearSesion([]).terminado).toBe(true);
  });
});

describe("completarSerie", () => {
  it("avanza a la siguiente serie e inicia el descanso del ejercicio", () => {
    const s = completarSerie(crearSesion(DOS_EJERCICIOS), AHORA);
    expect(s.indice).toBe(0);
    expect(s.serie).toBe(2);
    expect(s.descansoTerminaEn).toBe(AHORA + 60_000);
  });

  it("al acabar las series pasa al siguiente ejercicio con el descanso del anterior", () => {
    let s = crearSesion(DOS_EJERCICIOS);
    s = completarSerie(s, AHORA);
    s = completarSerie(s, AHORA);
    expect(s.indice).toBe(1);
    expect(s.serie).toBe(1);
    expect(s.descansoTerminaEn).toBe(AHORA + 60_000);
  });

  it("la última serie del día termina la sesión sin descanso", () => {
    let s = crearSesion(DOS_EJERCICIOS);
    s = completarSerie(s, AHORA);
    s = completarSerie(s, AHORA);
    s = completarSerie(s, AHORA);
    expect(s.terminado).toBe(true);
    expect(s.descansoTerminaEn).toBeNull();
  });

  it("sin descanso configurado no inicia cuenta regresiva", () => {
    const s = completarSerie(
      crearSesion([{ series: 3, descansoSegundos: 0 }]),
      AHORA,
    );
    expect(s.descansoTerminaEn).toBeNull();
  });

  it("trata series inválidas (0) como una sola serie", () => {
    const s = completarSerie(
      crearSesion([
        { series: 0, descansoSegundos: 30 },
        { series: 1, descansoSegundos: 30 },
      ]),
      AHORA,
    );
    expect(s.indice).toBe(1);
  });

  it("no cambia una sesión ya terminada", () => {
    const fin = crearSesion([]);
    expect(completarSerie(fin, AHORA)).toBe(fin);
  });
});

describe("descanso", () => {
  it("cuenta los segundos restantes redondeando hacia arriba", () => {
    const s = completarSerie(crearSesion(DOS_EJERCICIOS), AHORA);
    expect(segundosDescanso(s, AHORA)).toBe(60);
    expect(segundosDescanso(s, AHORA + 18_500)).toBe(42);
    expect(segundosDescanso(s, AHORA + 61_000)).toBe(0);
  });

  it("terminarDescanso lo corta y es 0 si no había", () => {
    const s = terminarDescanso(
      completarSerie(crearSesion(DOS_EJERCICIOS), AHORA),
    );
    expect(s.descansoTerminaEn).toBeNull();
    expect(segundosDescanso(s, AHORA)).toBe(0);
  });
});

describe("saltarEjercicio", () => {
  it("pasa al siguiente, cancela el descanso y lo registra como omitido", () => {
    let s = completarSerie(crearSesion(DOS_EJERCICIOS), AHORA);
    s = saltarEjercicio(s);
    expect(s.indice).toBe(1);
    expect(s.serie).toBe(1);
    expect(s.descansoTerminaEn).toBeNull();
    expect(s.omitidos).toEqual([0]);
  });

  it("saltar el último ejercicio termina la sesión", () => {
    let s = saltarEjercicio(crearSesion(DOS_EJERCICIOS));
    s = saltarEjercicio(s);
    expect(s.terminado).toBe(true);
    expect(ejerciciosRealizados(s)).toBe(0);
  });
});

describe("progresoEjercicio", () => {
  it("refleja series hechas, ejercicios previos y pendientes", () => {
    let s = crearSesion(DOS_EJERCICIOS);
    s = completarSerie(s, AHORA);
    expect(progresoEjercicio(s, 0)).toBe(0.5);
    expect(progresoEjercicio(s, 1)).toBe(0);
    s = completarSerie(s, AHORA);
    expect(progresoEjercicio(s, 0)).toBe(1);
  });

  it("un ejercicio saltado no cuenta como completado", () => {
    const s = saltarEjercicio(crearSesion(DOS_EJERCICIOS));
    expect(progresoEjercicio(s, 0)).toBe(0);
  });
});

describe("seriesRealizadas", () => {
  it("suma las series de los ejercicios no saltados", () => {
    let s = saltarEjercicio(crearSesion(DOS_EJERCICIOS));
    s = completarSerie(s, AHORA);
    expect(seriesRealizadas(s)).toBe(1);
  });
});

describe("formatearTemporizador", () => {
  it("usa mm:ss con ceros", () => {
    expect(formatearTemporizador(42)).toBe("00:42");
    expect(formatearTemporizador(90)).toBe("01:30");
    expect(formatearTemporizador(-5)).toBe("00:00");
  });
});
