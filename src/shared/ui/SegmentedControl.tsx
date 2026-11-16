import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/shared/ui/Typography";
import { conOpacidad, palette } from "@/shared/theme/palette";

interface OpcionSegmento<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: OpcionSegmento<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `sm` para usarlo como control pequeño embebido (ej. Peso/IMC dentro de una tarjeta). */
  size?: "default" | "sm";
}

/**
 * Selector de segmentos genérico y reutilizable (pastilla blanca deslizante
 * sobre fondo suave). Sirve tanto para alternar vistas completas
 * (Peso/Rutinas) como para mini-toggles dentro de una tarjeta (Peso/IMC).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "default",
}: SegmentedControlProps<T>) {
  const esPequeno = size === "sm";

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.contenedor,
        esPequeno ? styles.contenedorSm : styles.contenedorDefault,
      ]}
    >
      {options.map((opcion) => {
        const activo = opcion.value === value;
        return (
          <TouchableOpacity
            key={opcion.value}
            onPress={() => onChange(opcion.value)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            hitSlop={esPequeno ? { top: 6, bottom: 6 } : undefined}
            style={[
              styles.opcion,
              esPequeno ? styles.opcionSm : styles.opcionDefault,
              activo && styles.opcionActiva,
            ]}
          >
            <Text
              style={[
                styles.texto,
                esPequeno ? styles.textoSm : styles.textoDefault,
                activo ? styles.textoActivo : styles.textoInactivo,
              ]}
            >
              {opcion.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: "row",
    borderRadius: 9999,
    backgroundColor: conOpacidad(palette.primaryLight, 0.25),
  },
  contenedorDefault: {
    padding: 4,
  },
  contenedorSm: {
    padding: 2,
  },
  opcion: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  opcionDefault: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
  },
  opcionSm: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  opcionActiva: {
    backgroundColor: palette.background,
    elevation: 2,
    shadowColor: palette.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  texto: {
    fontWeight: "600",
  },
  textoDefault: {
    fontSize: 14,
  },
  textoSm: {
    fontSize: 13,
  },
  textoActivo: {
    color: palette.foreground,
  },
  textoInactivo: {
    color: palette.textSecondary,
  },
});
