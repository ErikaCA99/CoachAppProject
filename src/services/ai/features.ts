import type {
  NivelExperiencia,
  ObjetivoUsuario,
  Usuario,
} from "@/models/entities/Usuario";
import { DIAS_POR_NIVEL } from "@/utils/generadorRutinas";
import { calcularIMC } from "@/utils/imcCalculator";

/**
 * Contrato de ENTRADA del modelo de rutinas con IA (TensorFlow Lite).
 *
 * El orden de `NOMBRES_FEATURES` es el orden exacto de las columnas con las
 * que se entrena el modelo en Python. Cualquier cambio (agregar, quitar o
 * reordenar) obliga a reentrenar y a subir `VERSION_FEATURES`.
 *
 * Se envían valores crudos (sin normalizar): la normalización vive dentro
 * del propio modelo (capa `Normalization` de Keras), para no duplicar
 * medias/desviaciones entre Python y TypeScript.
 */

export const VERSION_FEATURES = 1;

export const NOMBRES_FEATURES = [
  "edad",
  "genero_masculino",
  "genero_femenino",
  "imc",
  "nivel",
  "dias_disponibles",
  "obj_perder_peso",
  "obj_ganar_masa",
  "obj_mantenimiento",
  "obj_resistencia",
] as const;

export const NUM_FEATURES = NOMBRES_FEATURES.length;

const ORDEN_OBJETIVOS: readonly ObjetivoUsuario[] = [
  "perder_peso",
  "ganar_masa",
  "mantenimiento",
  "resistencia",
];

const CODIGO_NIVEL: Record<NivelExperiencia, number> = {
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
};

/**
 * Valores de reemplazo para perfiles creados antes de que existieran estos
 * campos. Deben coincidir con los que usa el script de entrenamiento al
 * imputar faltantes.
 */
export const VALORES_POR_DEFECTO = {
  edad: 30,
  imc: 24,
} as const;

export type EntradaModelo = Pick<
  Usuario,
  "genero" | "edad" | "altura" | "pesoActual" | "diasDisponibles"
> & {
  objetivo: ObjetivoUsuario;
  nivel: NivelExperiencia;
};

/** Construye el vector de entrada del modelo en el orden de `NOMBRES_FEATURES`. */
export function construirFeatures(entrada: EntradaModelo): Float32Array {
  const imc =
    entrada.altura && entrada.pesoActual
      ? calcularIMC(entrada.pesoActual, entrada.altura)
      : VALORES_POR_DEFECTO.imc;

  const vector = [
    entrada.edad ?? VALORES_POR_DEFECTO.edad,
    entrada.genero === "masculino" ? 1 : 0,
    entrada.genero === "femenino" ? 1 : 0,
    imc,
    CODIGO_NIVEL[entrada.nivel],
    entrada.diasDisponibles ?? DIAS_POR_NIVEL[entrada.nivel],
    ...ORDEN_OBJETIVOS.map((o) => (o === entrada.objetivo ? 1 : 0)),
  ];

  if (vector.length !== NUM_FEATURES) {
    throw new Error(
      `Vector de features inválido: ${vector.length} != ${NUM_FEATURES}`,
    );
  }
  return Float32Array.from(vector);
}
