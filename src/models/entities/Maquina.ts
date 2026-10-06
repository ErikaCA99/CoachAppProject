/**
 * Máquina del catálogo del gimnasio (`maquinas/{id}` en Firestore).
 *
 * El catálogo es de solo lectura para la app: lo escribe el script de seed
 * (`catalogo-firebase/seed/seed.mjs`) con el SDK Admin. Las imágenes y los
 * GIFs se guardan como **rutas** de Firebase Storage (p. ej.
 * `maquinas/prensa-piernas/principal.webp`); la URL de descarga se resuelve
 * en tiempo de ejecución con `MaquinasController.obtenerUrl`.
 */

export type TipoMaquina = "maquina" | "polea" | "banco-rack" | "cardio";

export const TIPOS_MAQUINA: Record<
  TipoMaquina,
  { etiqueta: string; icono: string }
> = {
  maquina: { etiqueta: "Máquina", icono: "settings-outline" },
  polea: { etiqueta: "Polea", icono: "git-pull-request-outline" },
  "banco-rack": { etiqueta: "Banco y rack", icono: "barbell-outline" },
  cardio: { etiqueta: "Cardio", icono: "heart-outline" },
};

export type DificultadEjercicio = "Principiante" | "Intermedio" | "Avanzado";

/** Producto real del que proviene una foto de la galería. */
export interface VarianteMaquina {
  nombre: string;
  handle: string;
  imagen: string | null; // ruta de Storage
}

/** Ejercicio asociado con ids de wger y/o free-exercise-db. */
export interface EjercicioMaquina {
  nombre: string;
  wgerId: number | null;
  freeExerciseDbId: string | null;
  imagenes: string[]; // rutas de Storage (posición inicial / final)
}

/** Ejercicio con GIF de uso correcto (WorkoutX). */
export interface EjercicioGif {
  workoutxId: string;
  nombre: string;
  nombreOriginal: string;
  dificultad: DificultadEjercicio;
  musculoObjetivo: string;
  gifPath: string; // ruta de Storage
}

export interface Maquina {
  id: string;
  nombre: string;
  categoria: string;
  tipo: TipoMaquina;
  orden: number;
  descripcion: string;
  musculosPrincipales: string[];
  musculosSecundarios: string[];
  instrucciones: string[];
  erroresComunes: string[];
  prevencionLesiones: string[];
  imagenPrincipal: string;
  gifPrincipal: string | null;
  variantes: VarianteMaquina[];
  ejercicios: EjercicioMaquina[];
  ejerciciosGif: EjercicioGif[];
  wgerIds: number[];
  workoutxIds: string[];
}
