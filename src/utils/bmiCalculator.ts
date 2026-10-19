/**
 * Utilidad pura para el cálculo del Índice de Masa Corporal (IMC).
 * Sin efectos secundarios ni dependencias externas — solo matemática.
 */

export type BmiCategory = "BAJO" | "NORMALIDAD" | "SOBREPESO" | "OBESIDAD";

/**
 * Calcula el IMC a partir del peso en kilogramos y la altura en centímetros.
 * @returns el IMC redondeado a 1 decimal.
 */
export function calcularIMC(pesoKg: number, alturaCm: number): number {
  const alturaM = alturaCm / 100;
  return Number((pesoKg / (alturaM * alturaM)).toFixed(1));
}

/**
 * Clasifica un valor de IMC según los rangos estándar de la OMS.
 */
export function clasificarIMC(imc: number): BmiCategory {
  if (imc < 18.5) return "BAJO";
  if (imc < 25) return "NORMALIDAD";
  if (imc < 30) return "SOBREPESO";
  return "OBESIDAD";
}

/** Etiqueta legible en español para cada categoría de IMC. */
export const ETIQUETAS_IMC: Record<BmiCategory, string> = {
  BAJO: "Bajo peso",
  NORMALIDAD: "Normal",
  SOBREPESO: "Sobrepeso",
  OBESIDAD: "Obesidad",
};

export interface RangoReferenciaIMC {
  categoria: string;
  rango: string;
  color: string;
}

export const TABLA_REFERENCIA_IMC: readonly RangoReferenciaIMC[] = [
  { categoria: "Bajo peso", rango: "< 18.5", color: "#add9d1" },
  { categoria: "Normal", rango: "18.5 – 24.9", color: "#1a8062" },
  { categoria: "Sobrepeso", rango: "25 – 29.9", color: "#f2c0a2" },
  { categoria: "Obesidad I", rango: "30 – 34.9", color: "#f29580" },
  { categoria: "Obesidad II+", rango: "≥ 35", color: "#c0391b" },
] as const;

/** Mensaje de contexto para el usuario según su categoría de IMC. */
export function obtenerMensajeIMC(categoria: BmiCategory): string {
  switch (categoria) {
    case "BAJO":
      return "Tu peso está por debajo de lo recomendado para tu estatura.";
    case "NORMALIDAD":
      return "Tu peso se encuentra en un rango saludable para tu estatura.";
    case "SOBREPESO":
      return "Estás por encima del rango sugerido. Mantén actividad física y nutrición equilibrada.";
    case "OBESIDAD":
      return "Tu índice indica obesidad. Se recomienda seguimiento profesional de salud.";
  }
}
