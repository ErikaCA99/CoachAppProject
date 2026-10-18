/**
 * Ejercicio del catálogo público (`ejercicios/{ejercicioId}`).
 * Es independiente de `EjercicioRutina` (que vive embebido dentro de una
 * `Rutina`); esta entidad representa la ficha descriptiva de un ejercicio
 * tal como aparece en la base de datos de referencia.
 */
export interface Ejercicio {
  id: string;
  nombre: string;
  maquinaId?: number;
  grupoMuscular: string[];
  descripcion: string;
  seriesRecomendadas?: number;
  repeticionesRecomendadas?: number;
  videoUrl?: string | null;
  imagenUrl?: string | null;
}
