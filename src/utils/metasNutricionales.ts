import type {
  GeneroUsuario,
  ObjetivoUsuario,
  Usuario,
} from "@/models/entities/Usuario";

/**
 * Cálculo de metas nutricionales diarias personalizadas.
 * Utilidad pura, sin dependencias externas — solo matemática.
 *
 * 1. Tasa metabólica basal (TMB) — ecuación de Mifflin-St Jeor (1990):
 *      hombres: 10·peso + 6,25·altura − 5·edad + 5
 *      mujeres: 10·peso + 6,25·altura − 5·edad − 161
 *    Para género "otro" o no informado se usa el promedio de ambas (−78).
 * 2. Gasto energético total = TMB × factor de actividad (según los días que
 *    el usuario entrena por semana).
 * 3. Ajuste por objetivo: déficit para perder peso, superávit para ganar masa.
 * 4. Macronutrientes: proteína en g/kg según objetivo, grasas como % de las
 *    kcal y carbohidratos con el resto.
 *
 * Son estimaciones referenciales: la app no reemplaza a un nutricionista
 * (alcance del proyecto).
 */

export interface MetasNutricionales {
  calorias: number;
  proteinas: number; // g
  carbohidratos: number; // g
  grasas: number; // g
}

export const METAS_POR_DEFECTO: MetasNutricionales = {
  calorias: 2000,
  proteinas: 150,
  carbohidratos: 200,
  grasas: 65,
};

const KCAL_POR_GRAMO = { proteinas: 4, carbohidratos: 4, grasas: 9 } as const;

const CONSTANTE_GENERO: Record<GeneroUsuario | "desconocido", number> = {
  masculino: 5,
  femenino: -161,
  otro: -78,
  desconocido: -78,
};

/** Piso calórico de seguridad: nunca recomendar menos que esto. */
const MINIMO_KCAL: Record<GeneroUsuario | "desconocido", number> = {
  masculino: 1500,
  femenino: 1200,
  otro: 1350,
  desconocido: 1350,
};

const AJUSTE_OBJETIVO_KCAL: Record<ObjetivoUsuario, number> = {
  perder_peso: -500,
  ganar_masa: 300,
  mantenimiento: 0,
  resistencia: 0,
};

const PROTEINA_G_POR_KG: Record<ObjetivoUsuario, number> = {
  perder_peso: 2.0,
  ganar_masa: 1.8,
  mantenimiento: 1.6,
  resistencia: 1.4,
};

const PORCENTAJE_GRASAS = 0.25;

/** Factor de actividad según días de entrenamiento por semana. */
export function factorActividad(diasPorSemana?: number): number {
  if (!diasPorSemana || diasPorSemana <= 1) return 1.2; // sedentario
  if (diasPorSemana <= 3) return 1.375; // ligera
  if (diasPorSemana <= 5) return 1.55; // moderada
  return 1.725; // intensa
}

export function calcularTMB(p: {
  pesoKg: number;
  alturaCm: number;
  edad: number;
  genero?: GeneroUsuario;
}): number {
  return (
    10 * p.pesoKg +
    6.25 * p.alturaCm -
    5 * p.edad +
    CONSTANTE_GENERO[p.genero ?? "desconocido"]
  );
}

export type DatoFaltante = "peso" | "altura" | "edad";

export interface ResultadoMetas {
  metas: MetasNutricionales;
  /** `false` si faltan datos del perfil y se usaron las metas por defecto. */
  personalizada: boolean;
  faltantes: DatoFaltante[];
  /** Detalle del cálculo (para mostrar al usuario o documentar). */
  detalle?: {
    tmb: number;
    factorActividad: number;
    gastoTotal: number;
    ajusteObjetivo: number;
  };
}

export function calcularMetasNutricionales(
  perfil: Pick<
    Usuario,
    "pesoActual" | "altura" | "edad" | "genero" | "objetivo" | "diasDisponibles"
  > | null,
): ResultadoMetas {
  const faltantes: DatoFaltante[] = [];
  if (!perfil?.pesoActual) faltantes.push("peso");
  if (!perfil?.altura) faltantes.push("altura");
  if (!perfil?.edad) faltantes.push("edad");

  if (!perfil || faltantes.length > 0) {
    return { metas: METAS_POR_DEFECTO, personalizada: false, faltantes };
  }

  const pesoKg = perfil.pesoActual!;
  const objetivo = perfil.objetivo ?? "mantenimiento";
  const genero = perfil.genero ?? "desconocido";

  const tmb = calcularTMB({
    pesoKg,
    alturaCm: perfil.altura!,
    edad: perfil.edad!,
    genero: perfil.genero,
  });
  const factor = factorActividad(perfil.diasDisponibles);
  const gastoTotal = tmb * factor;
  const ajuste = AJUSTE_OBJETIVO_KCAL[objetivo];
  const calorias = Math.round(
    Math.max(MINIMO_KCAL[genero], gastoTotal + ajuste),
  );

  const proteinas = Math.round(pesoKg * PROTEINA_G_POR_KG[objetivo]);
  const grasas = Math.round(
    Math.max(
      pesoKg * 0.6,
      (calorias * PORCENTAJE_GRASAS) / KCAL_POR_GRAMO.grasas,
    ),
  );
  const kcalRestantes =
    calorias -
    proteinas * KCAL_POR_GRAMO.proteinas -
    grasas * KCAL_POR_GRAMO.grasas;
  const carbohidratos = Math.max(
    0,
    Math.round(kcalRestantes / KCAL_POR_GRAMO.carbohidratos),
  );

  return {
    metas: { calorias, proteinas, carbohidratos, grasas },
    personalizada: true,
    faltantes: [],
    detalle: {
      tmb: Math.round(tmb),
      factorActividad: factor,
      gastoTotal: Math.round(gastoTotal),
      ajusteObjetivo: ajuste,
    },
  };
}
