/**
 * Máquina/ejercicio normalizado al español, tal como lo consume la UI.
 * El repositorio (`maquinaRepository.ts`) es el único lugar que sabe mapear
 * la forma cruda de la API externa (wger) a esta interfaz.
 */
export interface Maquina {
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

export interface CategoriaMaquina {
  id: number;
  nombre: string;
}
