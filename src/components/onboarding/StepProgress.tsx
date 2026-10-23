import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

interface ProgresoPasosProps {
  /** Paso actual (1..total). */
  paso: number;
  total?: number;
  /** Si se pasa, muestra el botón de volver a la izquierda. */
  onBack?: () => void;
}

/**
 * Encabezado del onboarding: botón de volver opcional, etiqueta "Paso X de N"
 * y una barra de segmentos que se llenan hasta el paso actual.
 */
export function ProgresoPasos({ paso, total = 3, onBack }: ProgresoPasosProps) {
  return (
    <View className="mb-5">
      <View className="min-h-11 flex-row items-center justify-between">
        {onBack ? (
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-primary-light/30"
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color={palette.foreground} />
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text className="text-sm font-bold text-foreground">
          Paso {paso} de {total}
        </Text>
      </View>
      <View
        className="mt-3 flex-row gap-1.5"
        accessible
        accessibilityLabel={`Paso ${paso} de ${total}`}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < paso ? "bg-primary" : "bg-primary-light"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
