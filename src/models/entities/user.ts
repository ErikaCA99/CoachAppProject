export type ObjetivoUsuario = 'perder_peso' | 'ganar_masa' | 'mantenimiento' | 'resistencia';
export type NivelExperiencia = 'principiante' | 'intermedio' | 'avanzado';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  genero?: 'masculino' | 'femenino' | 'otro';
  edad?: number; 
  fechaNacimiento?: string; // ISO date
  altura?: number; // cm
  pesoActual?: number; // kg
  nivel?: NivelExperiencia;
  objetivo?: ObjetivoUsuario;
  creadoEn: string; // ISO date
}