/**
 * Paleta de la app, en sincronía con `src/global.css` y `tailwind.config.js`.
 * Úsala solo donde NativeWind no llega (props nativas como tabBarActiveTintColor,
 * ActivityIndicator color, headerTintColor, etc). En JSX usa las clases de Tailwind
 * (bg-primary, text-foreground, border-border...) en vez de este objeto.
 */
export const palette = {
  primary: "#32a685",
  primaryLight: "#add9d1",
  secondary: "#f2c0a2",
  accent: "#f29580",
  accentStrong: "#d95032",
  background: "#ffffff",
  surface: "#add9d1",
  foreground: "#1f2937",
  textPrimary: "#1f2937",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  border: "#add9d1",
  success: "#32a685",
  warning: "#f2c0a2",
  error: "#d95032",
} as const;
