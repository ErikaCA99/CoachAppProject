import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette } from "@/constants/palette";

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
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
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
    backgroundColor: "rgba(173, 217, 209, 0.25)",
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
    paddingVertical: 8,
  },
  opcionSm: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  opcionActiva: {
    backgroundColor: palette.background,
    elevation: 2,
    shadowColor: "#000",
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
    fontSize: 12,
  },
  textoActivo: {
    color: palette.foreground,
  },
  textoInactivo: {
    color: palette.textSecondary,
  },
});
