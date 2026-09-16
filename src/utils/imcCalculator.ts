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
