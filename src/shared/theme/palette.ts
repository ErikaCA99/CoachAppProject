/**
 * Paleta de la app, en sincronía con `src/global.css` y `tailwind.config.js`.
 * Úsala solo donde NativeWind no llega (props nativas como tabBarActiveTintColor,
 * ActivityIndicator color, headerTintColor, etc). En JSX usa las clases de Tailwind
 * (bg-primary, text-foreground, border-border...) en vez de este objeto.
 */
export const palette = {
  primary: "#1a8062",
  primaryLight: "#add9d1",
  /** Extremo oscuro de los degradados de botones/tarjetas (solo props nativas). */
  primaryDark: "#146a50",
  secondary: "#f2c0a2",
  accent: "#f29580",
  accentStrong: "#c0391b",
  background: "#ffffff",
  surface: "#add9d1",
  foreground: "#1f2937",
  textPrimary: "#1f2937",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  border: "#add9d1",
  success: "#1a8062",
  warning: "#f2c0a2",
  error: "#c0391b",
  /** Botones deshabilitados (extremo único del degradado gris). */
  disabled: "#a3aeab",
  /** Vista de cámara y cargador: no hay tema oscuro, estos dos fondos son la excepción. */
  cameraDark: "#0f1d18",
  cameraDarkEnd: "#132a22",
} as const;

/**
 * Devuelve `color` (#rrggbb de la paleta) con la opacidad dada (0..1), para
 * props nativas que no aceptan clases como `bg-primary/25`.
 */
export function conOpacidad(color: string, opacidad: number): string {
  const alfa = Math.round(Math.min(1, Math.max(0, opacidad)) * 255);
  return `${color}${alfa.toString(16).padStart(2, "0")}`;
}
