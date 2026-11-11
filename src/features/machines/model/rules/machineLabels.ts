/**
 * Clases del modelo de reconocimiento de máquinas, en el ORDEN de su salida.
 * Son los ids del catálogo de Firestore (`maquinas/{id}`). Generado desde
 * `ml/results/recognition/labels.json`: si se reentrena el modelo con
 * otras clases, hay que regenerar este archivo.
 */
export const ETIQUETAS_MAQUINAS: readonly string[] = [
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
