/**
 * Imagen de respaldo para un ejercicio de wger que NO trae foto
 * (`ejerciciosWger/{wgerId}` en Firestore, solo lectura).
 *
 * La escribe el script de seed (`catalogo-firebase/seed/seed.mjs`). Todas las
 * imágenes son **rutas** de Firebase Storage, no URLs; se resuelven con
 * `MaquinasController.obtenerUrl`.
 */
export interface ImagenEjercicioWger {
  wgerId: number;
  /** Nombre del ejercicio en wger (en inglés), solo para trazabilidad. */
  nombreWger: string;
  /** Fotos de inicio y final (free-exercise-db, dominio público). Puede estar vacío. */
  imagenes: string[];
  /** Pasos en español (del dataset de Gym Visual). Vacío si no hay. */
  pasos: string[];
  /** GIF animado de Gym Visual (requiere mostrar la atribución). */
  gif: string | null;
  /** Miniatura estática de Gym Visual. */
  miniatura: string | null;
  /** Texto de atribución obligatorio cuando se usa material de Gym Visual. */
  atribucionGymVisual: string | null;
}
