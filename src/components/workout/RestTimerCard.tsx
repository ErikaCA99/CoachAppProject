import { TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { formatearTemporizador } from "@/utils/workoutSession";

interface TarjetaDescansoProps {
  segundosRestantes: number;
  segundosTotales: number;
  onSaltar: () => void;
}

/** Cuenta regresiva del descanso entre series, con barra y botón para saltarlo. */
export function TarjetaDescanso({
  segundosRestantes,
  segundosTotales,
  onSaltar,
}: TarjetaDescansoProps) {
  const transcurrido =
    segundosTotales > 0 ? 1 - segundosRestantes / segundosTotales : 1;

  return (
    <View className="rounded-2xl border border-border p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Descanso
          </Text>
          <Text
            className="text-[40px] font-bold leading-[48px] text-foreground"
            style={{ fontVariant: ["tabular-nums"] }}
            accessibilityLabel={`Descanso, ${segundosRestantes} segundos restantes`}
          >
            {formatearTemporizador(segundosRestantes)}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={onSaltar}
          className="min-h-11 justify-center rounded-xl border border-border px-5"
        >
          <Text className="text-sm font-bold text-foreground">
            Saltar descanso
          </Text>
        </TouchableOpacity>
      </View>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-light">
        <View
          className="h-full bg-primary"
          style={{ width: `${Math.round(transcurrido * 100)}%` }}
        />
      </View>
    </View>
  );
}
