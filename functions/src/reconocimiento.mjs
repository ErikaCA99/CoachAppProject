// Reconocimiento de máquinas: interpreta la respuesta del endpoint de Ultralytics.
// Las clases del modelo deben llamarse como los ids del catálogo
// (`maquinas/{id}`). Esta lista debe coincidir con
// `src/services/ai/machineLabels.ts`; la prueba `reconocimiento.test.mjs`
// lo comprueba.
export const ETIQUETAS_MAQUINAS = [
  "banco-pecho",
  "pec-deck",
  "press-pecho",
  "extension-espalda",
  "jalon-pecho",
  "dominadas-fondos-asistidos",
  "palanca-peso-muerto",
  "remo-t",
  "remo-sentado",
  "elevaciones-laterales",
  "press-hombro",
  "banco-predicador",
  "curl-biceps",
  "triceps",
  "biceps-triceps",
  "abductores-aductores",
  "curl-femoral",
  "extension-piernas",
  "pantorrillas",
  "extension-curl-piernas",
  "prensa-piernas",
  "sentadilla-guiada",
  "hip-thrust",
  "patada-gluteo",
  "multicadera",
  "abdominal",
  "torso-rotatorio",
  "estacion-poleas",
  "multiestacion",
  "smith",
  "rack-sentadilla",
  "eliptica",
  "bicicleta-estatica",
  "caminadora",
  "escaladora",
];

/** "Prensa Piernas" / "prensa_piernas" -> "prensa-piernas" */
export function normalizarClase(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * El detector se entrenó con 42 clases y el catálogo tiene 35 máquinas.
 * Tres clases son la misma máquina con otro nombre (ALIAS_CLASES); las otras
 * cuatro no tienen ficha en el catálogo y se ignoran (la app cae en la
 * selección manual). Confirmar los alias antes de la defensa.
 */
export const ALIAS_CLASES = {
  "bicep-curl-machine": "curl-biceps",
  "hip-adduction-machine": "abductores-aductores",
  "extension-cuadriceps": "extension-piernas",
};
export const CLASES_SIN_FICHA = [
  "banco-olimpico-declinado-con-extension-de-piernas",
  "poleas-doble-cable",
  "press-alto",
  "remo-alto",
];

// Respuesta de Ultralytics: { images: [{ results: [{ class, name, confidence, box }] }] }
function candidatas(datos) {
  const imagen = datos?.images?.[0];
  const resultados = imagen?.results;
  if (!Array.isArray(resultados)) return [];
  return resultados.map((x) => ({
    clase: x?.name,
    confianza: x?.confidence,
    caja: normalizarCaja(x?.box, imagen.shape),
  }));
}

// Ultralytics devuelve píxeles de la imagen enviada; shape = [alto, ancho].
// La normalización conserva la geometría al reducir el JPEG sin recortarlo.
export function normalizarCaja(box, shape) {
  if (!Array.isArray(shape) || shape.length !== 2 || !box) return undefined;
  const [alto, ancho] = shape;
  const { x1, y1, x2, y2 } = box;
  if (![alto, ancho, x1, y1, x2, y2].every(Number.isFinite)) return undefined;
  if (
    alto <= 0 ||
    ancho <= 0 ||
    x1 < 0 ||
    y1 < 0 ||
    x2 > ancho ||
    y2 > alto ||
    x1 >= x2 ||
    y1 >= y2
  )
    return undefined;
  return { x1: x1 / ancho, y1: y1 / alto, x2: x2 / ancho, y2: y2 / alto };
}

/**
 * Devuelve hasta `max` sugerencias { maquinaId, confianza } ordenadas de mayor
 * a menor. Descarta clases sin ficha y confianzas inválidas; si una clase se
 * detecta varias veces (varias cajas) conserva la mayor.
 */
export function interpretarRespuesta(
  datos,
  { etiquetas = ETIQUETAS_MAQUINAS, max = 3 } = {},
) {
  const validas = new Set(etiquetas);
  const mejor = new Map();
  for (const { clase, confianza, caja } of candidatas(datos)) {
    const normalizada = normalizarClase(clase);
    const maquinaId = ALIAS_CLASES[normalizada] ?? normalizada;
    if (!validas.has(maquinaId)) continue;
    if (!Number.isFinite(confianza) || confianza < 0 || confianza > 1) continue;
    if (confianza > (mejor.get(maquinaId)?.confianza ?? -1))
      mejor.set(maquinaId, { maquinaId, confianza, ...(caja ? { caja } : {}) });
  }
  return [...mejor.values()]
    .sort((a, b) => b.confianza - a.confianza)
    .slice(0, max);
}
