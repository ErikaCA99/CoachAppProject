import type { Entrenamiento } from "@/models/entities/Workout";
import type { ProgresoFisico } from "@/models/entities/PhysicalProgress";
import type { RegistroNutricional } from "@/models/entities/NutritionRecord";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type Usuario,
} from "@/models/entities/User";
import { calcularRacha, formatearFechaISO } from "@/utils/workoutStats";
import {
  clasificarIMC,
  ETIQUETAS_IMC,
  type BmiCategory,
} from "@/utils/bmiCalculator";
import type { ResultadoMetas } from "@/utils/nutritionGoals";

/**
 * Reporte personalizado de progreso físico (OE7).
 * Utilidad pura: recibe los datos ya leídos, calcula el resumen del período
 * y arma el HTML que luego se imprime a PDF. Sin Firebase ni APIs nativas,
 * así se puede probar y documentar de forma aislada.
 */

/** `null` = todo el historial. */
export type PeriodoReporte = 7 | 30 | 90 | null;

export const PERIODOS_REPORTE: { valor: PeriodoReporte; etiqueta: string }[] = [
  { valor: 7, etiqueta: "7 días" },
  { valor: 30, etiqueta: "30 días" },
  { valor: 90, etiqueta: "90 días" },
  { valor: null, etiqueta: "Todo" },
];

export interface DatosReporte {
  perfil: Usuario | null;
  progreso: ProgresoFisico[];
  nutricion: RegistroNutricional[];
  entrenamientos: Entrenamiento[];
  metas: ResultadoMetas;
  periodo: PeriodoReporte;
  ahora?: Date;
}

export interface PuntoPeso {
  fecha: string; // YYYY-MM-DD
  peso: number;
  imc: number | null;
}

export interface DiaNutricion {
  fecha: string; // YYYY-MM-DD
  calorias: number;
}

export interface ResumenReporte {
  generadoEn: Date;
  desde: string | null; // YYYY-MM-DD, null = sin límite
  hasta: string;
  perfil: {
    nombre: string;
    edad?: number;
    genero?: string;
    altura?: number;
    objetivo?: string;
    nivel?: string;
    diasDisponibles?: number;
  };
  peso: {
    registros: PuntoPeso[];
    inicial: number | null;
    final: number | null;
    cambio: number | null;
    minimo: number | null;
    maximo: number | null;
    imcActual: number | null;
    categoriaIMC: BmiCategory | null;
  };
  entrenamientos: {
    total: number;
    semanas: number;
    promedioSemanal: number;
    metaSemanal: number | null;
    adherencia: number | null; // %
    rachaActual: number;
  };
  nutricion: {
    diasRegistrados: number;
    promedioCalorias: number | null;
    promedioProteinas: number | null;
    promedioCarbohidratos: number | null;
    promedioGrasas: number | null;
    metaCalorias: number;
    metaPersonalizada: boolean;
    diasEnMeta: number; // ±10 % de la meta
    serie: DiaNutricion[];
  };
}

const ETIQUETA_GENERO: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
};

const MS_DIA = 24 * 60 * 60 * 1000;

const redondear1 = (n: number) => Math.round(n * 10) / 10;
const promedio = (valores: number[]) =>
  valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;

function fechaDe(valor: Date | undefined | null): string | null {
  return valor instanceof Date ? formatearFechaISO(valor) : null;
}

export function calcularResumenReporte(datos: DatosReporte): ResumenReporte {
  const ahora = datos.ahora ?? new Date();
  const hasta = formatearFechaISO(ahora);
  const desde =
    datos.periodo === null
      ? null
      : formatearFechaISO(
          new Date(ahora.getTime() - (datos.periodo - 1) * MS_DIA),
        );
  const enPeriodo = (fecha: string | null) =>
    fecha !== null && (desde === null || fecha >= desde) && fecha <= hasta;

  // ── Perfil ──
  const p = datos.perfil;
  const perfil: ResumenReporte["perfil"] = {
    nombre: [p?.nombre, p?.apellidos].filter(Boolean).join(" ") || "Usuario",
    edad: p?.edad,
    genero: p?.genero ? ETIQUETA_GENERO[p.genero] : undefined,
    altura: p?.altura,
    objetivo: p?.objetivo ? OBJETIVOS_USUARIO[p.objetivo].etiqueta : undefined,
    nivel: p?.nivel ? NIVELES_EXPERIENCIA[p.nivel].etiqueta : undefined,
    diasDisponibles: p?.diasDisponibles,
  };

  // ── Peso ──
  const registrosPeso: PuntoPeso[] = datos.progreso
    .map((r) => ({
      fecha: fechaDe(r.creadoEn),
      peso: r.peso,
      imc: r.imc ?? null,
    }))
    .filter((r): r is PuntoPeso => enPeriodo(r.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pesos = registrosPeso.map((r) => r.peso);
  const ultimo = registrosPeso[registrosPeso.length - 1];
  const imcActual =
    ultimo?.imc ??
    (ultimo && p?.altura
      ? redondear1(ultimo.peso / (p.altura / 100) ** 2)
      : null);

  // ── Entrenamientos ──
  const fechasEntreno = datos.entrenamientos.map((e) => e.fecha);
  const entrenosPeriodo = fechasEntreno.filter(enPeriodo);
  const primerDia =
    desde ??
    [...fechasEntreno, ...registrosPeso.map((r) => r.fecha)].sort()[0] ??
    hasta;
  const diasPeriodo = Math.max(
    1,
    Math.round((Date.parse(hasta) - Date.parse(primerDia)) / MS_DIA) + 1,
  );
  const semanas = Math.max(1, diasPeriodo / 7);
  const promedioSemanal = redondear1(entrenosPeriodo.length / semanas);
  const metaSemanal = p?.diasDisponibles ?? null;

  // ── Nutrición (solo registros de ingesta, no de IMC) ──
  const porDia = new Map<
    string,
    { kcal: number; p: number; c: number; g: number }
  >();
  for (const r of datos.nutricion) {
    if (!r.alimento) continue;
    const fecha = fechaDe(r.creadoEn);
    if (!enPeriodo(fecha)) continue;
    const dia = porDia.get(fecha!) ?? { kcal: 0, p: 0, c: 0, g: 0 };
    dia.kcal += r.calorias ?? 0;
    dia.p += r.proteinas ?? 0;
    dia.c += r.carbohidratos ?? 0;
    dia.g += r.grasas ?? 0;
    porDia.set(fecha!, dia);
  }
  const dias = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b));
  const meta = datos.metas.metas.calorias;
  const prom = (
    sel: (d: { kcal: number; p: number; c: number; g: number }) => number,
  ) => {
    const v = promedio(dias.map(([, d]) => sel(d)));
    return v === null ? null : Math.round(v);
  };

  return {
    generadoEn: ahora,
    desde,
    hasta,
    perfil,
    peso: {
      registros: registrosPeso,
      inicial: pesos.length ? pesos[0] : null,
      final: pesos.length ? pesos[pesos.length - 1] : null,
      cambio:
        pesos.length >= 2
          ? redondear1(pesos[pesos.length - 1] - pesos[0])
          : null,
      minimo: pesos.length ? Math.min(...pesos) : null,
      maximo: pesos.length ? Math.max(...pesos) : null,
      imcActual,
      categoriaIMC: imcActual ? clasificarIMC(imcActual) : null,
    },
    entrenamientos: {
      total: entrenosPeriodo.length,
      semanas: redondear1(semanas),
      promedioSemanal,
      metaSemanal,
      adherencia: metaSemanal
        ? Math.min(100, Math.round((promedioSemanal / metaSemanal) * 100))
        : null,
      rachaActual: calcularRacha(new Set(fechasEntreno), ahora),
    },
    nutricion: {
      diasRegistrados: dias.length,
      promedioCalorias: prom((d) => d.kcal),
      promedioProteinas: prom((d) => d.p),
      promedioCarbohidratos: prom((d) => d.c),
      promedioGrasas: prom((d) => d.g),
      metaCalorias: meta,
      metaPersonalizada: datos.metas.personalizada,
      diasEnMeta: dias.filter(([, d]) => Math.abs(d.kcal - meta) <= meta * 0.1)
        .length,
      serie: dias
        .slice(-31)
        .map(([fecha, d]) => ({ fecha, calorias: Math.round(d.kcal) })),
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// HTML del reporte (se imprime a PDF con expo-print)
// ──────────────────────────────────────────────────────────────────────────

const COLOR = {
  primario: "#1a8062",
  primarioClaro: "#add9d1",
  acento: "#f29580",
  acentoFuerte: "#c0391b",
  texto: "#1f2937",
  textoSuave: "#6b7280",
  borde: "#e5e7eb",
};

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "2026-10-17" → "17/10/2026" */
function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const valor = (v: number | null | undefined, unidad = "") =>
  v === null || v === undefined ? "—" : `${v}${unidad}`;

function graficoLineaPeso(puntos: PuntoPeso[]): string {
  if (puntos.length < 2) {
    return `<p class="vacio">Se necesitan al menos 2 registros de peso en el período para graficar la tendencia.</p>`;
  }
  const ancho = 640;
  const alto = 200;
  const m = { x: 44, y: 16 };
  const pesos = puntos.map((p) => p.peso);
  const min = Math.floor(Math.min(...pesos) - 1);
  const max = Math.ceil(Math.max(...pesos) + 1);
  const x = (i: number) =>
    m.x + (i * (ancho - m.x * 1.5)) / (puntos.length - 1);
  const y = (v: number) =>
    m.y + ((max - v) * (alto - m.y * 2)) / (max - min || 1);
  const linea = puntos
    .map((p, i) => `${x(i).toFixed(1)},${y(p.peso).toFixed(1)}`)
    .join(" ");
  const guias = [min, (min + max) / 2, max]
    .map(
      (v) =>
        `<line x1="${m.x}" x2="${ancho - m.x / 2}" y1="${y(v)}" y2="${y(v)}" stroke="${COLOR.borde}"/>` +
        `<text x="${m.x - 6}" y="${y(v) + 4}" text-anchor="end" class="eje">${redondear1(v)}</text>`,
    )
    .join("");
  const marcas = puntos
    .map(
      (p, i) =>
        `<circle cx="${x(i)}" cy="${y(p.peso)}" r="3.5" fill="${COLOR.primario}"/>`,
    )
    .join("");
  const etiquetasX = [0, puntos.length - 1]
    .map(
      (i) =>
        `<text x="${x(i)}" y="${alto - 2}" text-anchor="${i === 0 ? "start" : "end"}" class="eje">${fechaCorta(puntos[i].fecha)}</text>`,
    )
    .join("");
  return `<svg viewBox="0 0 ${ancho} ${alto + 12}" width="100%">${guias}
    <polyline points="${linea}" fill="none" stroke="${COLOR.primario}" stroke-width="2.5" stroke-linejoin="round"/>
    ${marcas}${etiquetasX}</svg>`;
}

function graficoBarrasCalorias(serie: DiaNutricion[], meta: number): string {
  if (serie.length === 0) {
    return `<p class="vacio">No hay alimentos registrados en el período.</p>`;
  }
  const ancho = 640;
  const alto = 200;
  const m = { x: 44, y: 16 };
  const max = Math.max(meta * 1.2, ...serie.map((d) => d.calorias));
  const anchoBarra = (ancho - m.x * 1.5) / serie.length;
  const y = (v: number) => m.y + ((max - v) * (alto - m.y * 2)) / max;
  const barras = serie
    .map((d, i) => {
      const color =
        Math.abs(d.calorias - meta) <= meta * 0.1
          ? COLOR.primario
          : d.calorias > meta
            ? COLOR.acento
            : COLOR.primarioClaro;
      const h = alto - m.y - y(d.calorias);
      return `<rect x="${m.x + i * anchoBarra + anchoBarra * 0.15}" y="${y(d.calorias)}" width="${anchoBarra * 0.7}" height="${Math.max(0, h)}" rx="2" fill="${color}"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${ancho} ${alto + 12}" width="100%">
    <line x1="${m.x}" x2="${ancho - m.x / 2}" y1="${alto - m.y}" y2="${alto - m.y}" stroke="${COLOR.borde}"/>
    ${barras}
    <line x1="${m.x}" x2="${ancho - m.x / 2}" y1="${y(meta)}" y2="${y(meta)}" stroke="${COLOR.acentoFuerte}" stroke-dasharray="6 4" stroke-width="1.5"/>
    <text x="${m.x - 6}" y="${y(meta) + 4}" text-anchor="end" class="eje">${meta}</text>
    <text x="${m.x}" y="${alto + 10}" class="eje">${fechaCorta(serie[0].fecha)}</text>
    <text x="${ancho - m.x / 2}" y="${alto + 10}" text-anchor="end" class="eje">${fechaCorta(serie[serie.length - 1].fecha)}</text>
  </svg>
  <p class="leyenda"><span style="background:${COLOR.primario}"></span>dentro de la meta (±10 %)
  <span style="background:${COLOR.acento}"></span>sobre la meta
  <span style="background:${COLOR.primarioClaro}"></span>bajo la meta
  <span class="guion"></span>meta diaria</p>`;
}

export function generarHtmlReporte(r: ResumenReporte): string {
  const periodo = r.desde
    ? `${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`
    : `Todo el historial (hasta ${fechaCorta(r.hasta)})`;
  const cambio = r.peso.cambio;
  const filasPeso = r.peso.registros
    .slice(-15)
    .map(
      (p) =>
        `<tr><td>${fechaCorta(p.fecha)}</td><td>${p.peso} kg</td><td>${valor(p.imc)}</td></tr>`,
    )
    .join("");
  const dato = (etiqueta: string, v: string) =>
    `<div class="dato"><span>${etiqueta}</span><strong>${escapar(v)}</strong></div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<style>
  @page { margin: 28px; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: ${COLOR.texto}; font-size: 12px; margin: 0; }
  header { border-bottom: 3px solid ${COLOR.primario}; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: ${COLOR.primario}; }
  h2 { font-size: 14px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid ${COLOR.borde}; }
  .sub { color: ${COLOR.textoSuave}; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .dato { min-width: 0; border: 1px solid ${COLOR.borde}; border-radius: 8px; padding: 8px 10px; }
  .dato span { display: block; color: ${COLOR.textoSuave}; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  .dato strong { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid ${COLOR.borde}; }
  th { color: ${COLOR.textoSuave}; font-size: 10px; text-transform: uppercase; }
  .eje { font-size: 10px; fill: ${COLOR.textoSuave}; }
  .vacio { color: ${COLOR.textoSuave}; font-style: italic; }
  .leyenda { color: ${COLOR.textoSuave}; font-size: 10px; }
  .leyenda span { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 4px 0 10px; vertical-align: middle; }
  .leyenda .guion { width: 16px; height: 0; border-top: 2px dashed ${COLOR.acentoFuerte}; border-radius: 0; }
  footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid ${COLOR.borde}; color: ${COLOR.textoSuave}; font-size: 10px; }
</style></head><body>
<header>
  <h1>Reporte de progreso físico</h1>
  <p class="sub"><strong>${escapar(r.perfil.nombre)}</strong> · Período: ${periodo}</p>
  <p class="sub">Generado el ${r.generadoEn.toLocaleDateString("es-BO")} a las ${r.generadoEn.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</p>
</header>

<h2>Perfil</h2>
<div class="grid">
  ${dato("Objetivo", r.perfil.objetivo ?? "—")}
  ${dato("Nivel", r.perfil.nivel ?? "—")}
  ${dato("Edad", valor(r.perfil.edad, " años"))}
  ${dato("Altura", valor(r.perfil.altura, " cm"))}
</div>

<h2>Peso e IMC</h2>
<div class="grid">
  ${dato("Peso inicial", valor(r.peso.inicial, " kg"))}
  ${dato("Peso final", valor(r.peso.final, " kg"))}
  ${dato("Cambio", cambio === null ? "—" : `${cambio > 0 ? "+" : ""}${cambio} kg`)}
  ${dato("IMC actual", r.peso.imcActual ? `${r.peso.imcActual} · ${ETIQUETAS_IMC[r.peso.categoriaIMC!]}` : "—")}
</div>
${graficoLineaPeso(r.peso.registros)}
${filasPeso ? `<table><thead><tr><th>Fecha</th><th>Peso</th><th>IMC</th></tr></thead><tbody>${filasPeso}</tbody></table>` : ""}

<h2>Entrenamientos</h2>
<div class="grid">
  ${dato("Completados", String(r.entrenamientos.total))}
  ${dato("Promedio semanal", `${r.entrenamientos.promedioSemanal} / sem`)}
  ${dato("Adherencia", r.entrenamientos.adherencia === null ? "—" : `${r.entrenamientos.adherencia} % de ${r.entrenamientos.metaSemanal} días`)}
  ${dato("Racha actual", `${r.entrenamientos.rachaActual} días`)}
</div>

<h2>Alimentación</h2>
<div class="grid">
  ${dato("Días registrados", String(r.nutricion.diasRegistrados))}
  ${dato("Promedio diario", valor(r.nutricion.promedioCalorias, " kcal"))}
  ${dato(r.nutricion.metaPersonalizada ? "Meta personalizada" : "Meta genérica", `${r.nutricion.metaCalorias} kcal`)}
  ${dato("Días en la meta", `${r.nutricion.diasEnMeta} de ${r.nutricion.diasRegistrados}`)}
</div>
<p class="sub" style="margin-top:6px">Macros promedio por día: proteínas ${valor(r.nutricion.promedioProteinas, " g")} · carbohidratos ${valor(r.nutricion.promedioCarbohidratos, " g")} · grasas ${valor(r.nutricion.promedioGrasas, " g")}</p>
${graficoBarrasCalorias(r.nutricion.serie, r.nutricion.metaCalorias)}

<footer>
  Reporte generado automáticamente por la aplicación a partir de los datos registrados por el usuario.
  La meta calórica es una estimación (Mifflin-St Jeor) y el sistema no reemplaza la supervisión de un
  entrenador o nutricionista profesional. Datos de alimentos: USDA FoodData Central.
</footer>
</body></html>`;
}
