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

/** Rango de edad aceptado (años). Mismo rango que valida `firestore.rules`. */
export const RANGO_EDAD = { min: 14, max: 90 } as const;

/** Opciones de días por semana que el usuario puede declarar como disponibles. */
export const OPCIONES_DIAS_DISPONIBLES = [2, 3, 4, 5, 6] as const;

export interface Usuario {
  id: string; // = uid de Firebase Auth
  nombre: string;
  apellidos?: string;
  email: string;
  genero?: GeneroUsuario;
  altura?: number; // cm
  pesoActual?: number; // kg
  /** Edad en años (entrada del modelo de rutinas con IA). */
  edad?: number;
  /** Días por semana que el usuario puede entrenar (entrada del modelo de rutinas con IA). */
  diasDisponibles?: number;
  nivel?: NivelExperiencia;
  objetivo?: ObjetivoUsuario;
  /** ID de la rutina activa dentro de `usuarios/{id}/rutinas`. */
  rutinaActivaId?: string | null;
  creadoEn?: Date;
}
