/**
 * Ejercicio de la API pública de wger, normalizado al español.
 * Lo consumen las rutinas (generación con IA y rutina personalizada).
 * El repositorio (`ejercicioWgerRepository.ts`) es el único lugar que sabe
 * mapear la forma cruda de wger a esta interfaz.
 *
 * No confundir con `Maquina` (catálogo de máquinas del gimnasio en Firestore).
 */
export interface EjercicioWger {
  id: number;
  nombre: string;
  categoria: string;
  categoriaId: number;
  gruposMusculares: string[];
  gruposMuscularesSecundarios: string[];
  equipo: string[];
  descripcion: string;
  instrucciones: string[];
  imagenUrl: string | null;
  imagenes: string[];
  videoUrl: string | null;
}

export interface CategoriaEjercicio {
  id: number;
  nombre: string;
}

export interface EquipoEjercicio {
  id: number;
  nombre: string;
}
