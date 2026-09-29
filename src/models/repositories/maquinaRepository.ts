import type { CategoriaMaquina, Maquina } from "@/models/entities/Maquina";
import {
  listarEjerciciosWger,
  obtenerEjercicioWgerPorId,
  type WgerExerciseInfo,
  type WgerTraduccion,
} from "@/services/wger/wgerService";

/**
 * Único módulo que conoce la forma cruda de la API de wger y sabe traducirla
 * al español / mapearla a la entidad de dominio `Maquina`. Ni los
 * controladores ni las vistas deben importar `wgerService` directamente.
 */

const IDIOMA_ESPANOL = 4;
const IDIOMA_INGLES = 2;

/** wger solo tiene 8 categorías; se traducen a mano para consistencia. */
const CATEGORIAS_ES: Record<number, string> = {
  10: "Abdominales",
  8: "Brazos",
  12: "Espalda",
  14: "Pantorrillas",
  15: "Cardio",
  11: "Pecho",
  9: "Piernas",
  13: "Hombros",
};

/** wger solo tiene 15 músculos catalogados; se traducen a mano. */
const MUSCULOS_ES: Record<number, string> = {
  2: "Deltoides anterior",
  1: "Bíceps",
  11: "Isquiotibiales",
  13: "Braquial",
  7: "Gemelos",
  8: "Glúteos",
  12: "Dorsal ancho",
  14: "Oblicuos",
  4: "Pectoral mayor",
  10: "Cuádriceps",
  6: "Abdominales",
  3: "Serrato anterior",
  15: "Sóleo",
  9: "Trapecio",
  5: "Tríceps",
};

/** wger solo tiene 12 equipos catalogados; se traducen a mano. */
const EQUIPO_ES: Record<number, string> = {
  1: "Barra",
  8: "Banco",
  12: "Máquina de poleas",
  3: "Mancuernas",
  4: "Colchoneta",
  9: "Banco inclinado",
  10: "Pesa rusa (kettlebell)",
  6: "Barra de dominadas",
  11: "Banda de resistencia",
  2: "Barra Z",
  5: "Fitball",
  7: "Sin equipo (peso corporal)",
};

function traducirCategoria(id: number, nombreOriginal: string): string {
  return CATEGORIAS_ES[id] ?? nombreOriginal;
}

function traducirMusculo(id: number, nombreOriginal: string): string {
  return MUSCULOS_ES[id] ?? nombreOriginal;
}

function traducirEquipo(id: number, nombreOriginal: string): string {
  return EQUIPO_ES[id] ?? nombreOriginal;
}

/** Quita etiquetas HTML y decodifica las entidades más comunes. */
function limpiarHtml(html: string): string {
  return html
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Extrae pasos de instrucciones a partir de listas `<li>` o párrafos `<p>`. */
function extraerInstrucciones(descripcionHtml: string): string[] {
  const items = [...descripcionHtml.matchAll(/<li[^>]*>(.*?)<\/li>/gis)].map(
    (m) => limpiarHtml(m[1]),
  );
  if (items.length > 0) return items.filter(Boolean);

  const parrafos = [...descripcionHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gis)].map(
    (m) => limpiarHtml(m[1]),
  );
  if (parrafos.length > 0) return parrafos.filter(Boolean);

  const textoPlano = limpiarHtml(descripcionHtml);
  return textoPlano ? [textoPlano] : [];
}

/** Prioriza la traducción en español; si no existe, cae a inglés; si no, la primera disponible. */
function elegirTraduccion(
  traducciones: WgerTraduccion[],
): WgerTraduccion | null {
  if (traducciones.length === 0) return null;
  return (
    traducciones.find((t) => t.language === IDIOMA_ESPANOL) ??
    traducciones.find((t) => t.language === IDIOMA_INGLES) ??
    traducciones[0]
  );
}

export function mapearAMaquina(raw: WgerExerciseInfo): Maquina {
  const traduccion = elegirTraduccion(raw.translations);
  const descripcionHtml = traduccion?.description ?? "";
  const imagenes = raw.images.map((img) => img.image);
  const imagenPrincipal =
    raw.images.find((img) => img.is_main)?.image ?? imagenes[0] ?? null;

  return {
    id: raw.id,
    nombre: traduccion?.name ?? "Ejercicio sin nombre",
    categoria: traducirCategoria(raw.category.id, raw.category.name),
    categoriaId: raw.category.id,
    gruposMusculares: raw.muscles.map((m) => traducirMusculo(m.id, m.name)),
    gruposMuscularesSecundarios: raw.muscles_secondary.map((m) =>
      traducirMusculo(m.id, m.name),
    ),
    equipo: raw.equipment.map((e) => traducirEquipo(e.id, e.name)),
    descripcion: limpiarHtml(descripcionHtml) || "Sin descripción disponible.",
    instrucciones: extraerInstrucciones(descripcionHtml),
    imagenUrl: imagenPrincipal,
    imagenes,
    videoUrl: raw.videos[0]?.video ?? null,
  };
}

export interface ResultadoListarMaquinas {
  items: Maquina[];
  total: number;
  siguienteOffset: number | null;
}

const TAMANO_PAGINA = 20;

export async function listarMaquinas(opciones: {
  categoriaId?: number;
  busqueda?: string;
  offset?: number;
}): Promise<ResultadoListarMaquinas> {
  const offset = opciones.offset ?? 0;
  const respuesta = await listarEjerciciosWger({
    categoria: opciones.categoriaId,
    busqueda: opciones.busqueda,
    limite: TAMANO_PAGINA,
    offset,
  });

  return {
    items: respuesta.results
      .map(mapearAMaquina)
      // Sin nombre real en ningún idioma conocido: no aporta a la UI.
      .filter((m) => m.nombre !== "Ejercicio sin nombre"),
    total: respuesta.count,
    siguienteOffset: respuesta.next ? offset + TAMANO_PAGINA : null,
  };
}

export async function obtenerMaquinaPorId(id: number): Promise<Maquina | null> {
  try {
    const raw = await obtenerEjercicioWgerPorId(id);
    return mapearAMaquina(raw);
  } catch {
    return null;
  }
}

export function listarCategoriasMaquinas(): CategoriaMaquina[] {
  return Object.entries(CATEGORIAS_ES)
    .map(([id, nombre]) => ({ id: Number(id), nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
