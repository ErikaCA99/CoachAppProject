import type { Timestamp } from "firebase/firestore";

export type ObjetivoUsuario =
  "perder_peso" | "ganar_masa" | "mantenimiento" | "resistencia";
export type NivelExperiencia = "principiante" | "intermedio" | "avanzado";
export type GeneroUsuario = "masculino" | "femenino" | "otro";

/** Metadatos legibles en español para mostrar en la UI. */
export const OBJETIVOS_USUARIO: Record<
  ObjetivoUsuario,
  { etiqueta: string; descripcion: string; icono: string }
> = {
  perder_peso: {
    etiqueta: "Perder peso",
    descripcion: "Reducir grasa corporal manteniendo la masa muscular",
    icono: "body-outline",
  },
  ganar_masa: {
    etiqueta: "Ganar masa muscular",
    descripcion: "Aumentar volumen e hipertrofia muscular",
    icono: "barbell-outline",
  },
  mantenimiento: {
    etiqueta: "Mantenimiento",
    descripcion: "Conservar tu condición física actual",
    icono: "heart-outline",
  },
  resistencia: {
    etiqueta: "Resistencia",
    descripcion: "Mejorar capacidad cardiovascular y aguante",
    icono: "bicycle-outline",
  },
};

export const NIVELES_EXPERIENCIA: Record<
  NivelExperiencia,
  { etiqueta: string; descripcion: string }
> = {
  principiante: {
    etiqueta: "Principiante",
    descripcion: "Soy nuevo en el gimnasio o llevo menos de 6 meses",
  },
  intermedio: {
    etiqueta: "Intermedio",
    descripcion: "Entreno con regularidad desde hace 6 meses a 2 años",
  },
  avanzado: {
    etiqueta: "Avanzado",
    descripcion: "Entreno con regularidad desde hace más de 2 años",
  },
};

export interface Usuario {
  id: string; // = uid de Firebase Auth
  nombre: string;
  apellidos?: string;
  email: string;
  genero?: GeneroUsuario;
  altura?: number; // cm
  pesoActual?: number; // kg
  nivel?: NivelExperiencia;
  objetivo?: ObjetivoUsuario;
  /** ID de la rutina activa dentro de `usuarios/{id}/rutinas`. */
  rutinaActivaId?: string | null;
  creadoEn?: Timestamp;
}
