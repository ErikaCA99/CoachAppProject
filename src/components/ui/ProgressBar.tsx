import { View } from "react-native";

import { palette } from "@/constants/palette";

interface BarraProgresoProps {
  /** Avance entre 0 y 1 (se limita al rango). */
  valor: number;
  /** Qué mide la barra; lo anuncia el lector de pantalla. */
  etiqueta: string;
  /** Texto de valor legible («3 de 5 días»); por defecto, el porcentaje. */
  textoValor?: string;
  /** Color de relleno (token de la paleta). */
  color?: string;
  /** Clases de alto y fondo de la pista. */
  claseCaja?: string;
}

/**
 * Barra de progreso con semántica `progressbar` (valor y rango) para que
 * TalkBack anuncie el avance en lugar de ignorar una vista sin texto.
 */
export function BarraProgreso({
  valor,
  etiqueta,
  textoValor,
  color = palette.primary,
  claseCaja = "h-1.5 bg-primary-light",
}: BarraProgresoProps) {
  const proporcion = Math.min(
    1,
    Math.max(0, Number.isFinite(valor) ? valor : 0),
  );
  const porcentaje = Math.round(proporcion * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: porcentaje,
        text: textoValor ?? `${porcentaje} %`,
      }}
      className={`w-full overflow-hidden rounded-full ${claseCaja}`}
    >
      <View
        className="h-full rounded-full"
        style={{ width: `${porcentaje}%`, backgroundColor: color }}
      />
    </View>
  );
}
