import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

import { palette } from "@/constants/palette";

interface IndicadorCargaProps extends Omit<ActivityIndicatorProps, "color"> {
  color?: string;
  /** Qué se está cargando; lo anuncia el lector de pantalla. */
  etiqueta?: string;
  /** Oculto al lector cuando un texto o botón contiguo ya describe la carga. */
  decorativo?: boolean;
}

/**
 * `ActivityIndicator` con semántica: sin etiqueta TalkBack lo ignora y la
 * persona no sabe que la pantalla está cargando.
 */
export function IndicadorCarga({
  color = palette.primary,
  etiqueta = "Cargando",
  decorativo = false,
  ...props
}: IndicadorCargaProps) {
  return (
    <ActivityIndicator
      color={color}
      {...(decorativo
        ? {
            accessible: false,
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants" as const,
          }
        : {
            accessible: true,
            accessibilityRole: "progressbar" as const,
            accessibilityLabel: etiqueta,
          })}
      {...props}
    />
  );
}
