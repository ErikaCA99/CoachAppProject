/**
 * Resultado de una acción del usuario (guardar, eliminar...). El hook que la
 * ejecuta decide si salió bien; la Vista solo decide cómo mostrar el error.
 */
export type ResultadoAccion =
  { ok: true } | { ok: false; titulo: string; mensaje: string };
