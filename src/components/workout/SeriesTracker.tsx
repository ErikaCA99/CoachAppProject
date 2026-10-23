import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

interface SeguimientoSeriesProps {
  totalSeries: number;
  /** Serie en curso (1-based). Las anteriores se muestran como hechas. */
  serieActual: number;
}

/** Círculos de 44 px: serie hecha (check), en curso (borde) o pendiente. */
export function SeguimientoSeries({
  totalSeries,
  serieActual,
}: SeguimientoSeriesProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {Array.from({ length: totalSeries }, (_, i) => {
        const numero = i + 1;
        const hecha = numero < serieActual;
        const enCurso = numero === serieActual;

        return (
          <View
            key={numero}
            accessibilityLabel={`Serie ${numero}, ${
              hecha ? "completada" : enCurso ? "en curso" : "pendiente"
            }`}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              hecha
                ? "bg-primary"
                : enCurso
                  ? "border-2 border-primary bg-background"
                  : "bg-primary-light/25"
            }`}
          >
            {hecha ? (
              <Ionicons name="checkmark" size={20} color={palette.background} />
            ) : (
              <Text
                className={`text-base font-bold ${
                  enCurso ? "text-primary" : "text-text-secondary"
                }`}
              >
                {numero}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
