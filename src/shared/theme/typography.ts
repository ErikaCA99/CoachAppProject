/**
 * Spline Sans en React Native: cada peso es un archivo y una familia propia
 * (en Android `fontWeight` no elige el archivo de una fuente personalizada).
 * Estas funciones traducen el peso que piden las clases de Tailwind
 * (`font-bold`, `font-semibold`…) o un estilo a la familia que hay que usar.
 */

export type FamiliaTipografica =
  | "SplineSans_400Regular"
  | "SplineSans_500Medium"
  | "SplineSans_600SemiBold"
  | "SplineSans_700Bold";

const PESO_POR_CLASE: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

/** Solo las clases de peso de Tailwind; `font-display`, `font-mono`… no. */
const CLASE_DE_PESO =
  /(?:^|\s)font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?=\s|$)/g;

/** Elige la familia cargada más cercana al peso numérico pedido. */
export function familiaPorPeso(peso: number): FamiliaTipografica {
  if (peso >= 700) return "SplineSans_700Bold";
  if (peso >= 600) return "SplineSans_600SemiBold";
  if (peso >= 500) return "SplineSans_500Medium";
  return "SplineSans_400Regular";
}

/** Convierte `fontWeight` de un estilo ("bold", "600", 600…) a número. */
export function pesoDeEstilo(
  fontWeight: string | number | undefined,
): number | undefined {
  if (fontWeight === undefined) return undefined;
  if (fontWeight === "normal") return 400;
  if (fontWeight === "bold") return 700;
  const numero = Number(fontWeight);
  return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Separa el peso de una cadena de clases. Devuelve las clases sin la clase de
 * peso (para que NativeWind no vuelva a poner `fontWeight`) y el peso, que es
 * el de la última clase de peso presente.
 */
export function separarPesoDeClases(className: string | undefined): {
  className: string | undefined;
  peso: number | undefined;
} {
  if (!className) return { className, peso: undefined };

  let peso: number | undefined;
  const limpia = className
    .replace(CLASE_DE_PESO, (_coincidencia, nombre: string) => {
      peso = PESO_POR_CLASE[nombre];
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  return { className: limpia, peso };
}
