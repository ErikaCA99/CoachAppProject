/**
 * Quita tildes y pasa a minúsculas, para comparar texto sin importar acentos
 * ("prensa" = "Prensa", "biceps" = "bíceps").
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
