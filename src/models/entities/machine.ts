export interface Maquina {
  id: string;
  nombre: string;
  grupoMuscular: string[];
  descripcion: string;
  instrucciones: string[];
  videoUrl?: string;
  imagenUrl?: string;
}