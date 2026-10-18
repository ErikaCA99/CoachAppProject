import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { palette } from "@/constants/palette";
import { TABLA_REFERENCIA_IMC } from "@/utils/bmiCalculator";

export function TablaReferenciaIMC() {
  return (
    <View className="mb-6 rounded-3xl border border-border/50 bg-white p-5 shadow-sm">
      {/* Encabezado */}
      <View className="mb-4 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface/40">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={palette.primary}
          />
        </View>
        <Text className="text-base font-bold text-foreground">
          Tabla de referencia
        </Text>
      </View>

      {/* Filas de referencia */}
      <View className="divide-y divide-border/20">
        {TABLA_REFERENCIA_IMC.map((item) => (
          <View
            key={item.categoria}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center gap-2.5">
              <View
                style={{ backgroundColor: item.color }}
                className="h-3 w-3 rounded-full"
              />
              <Text className="text-sm font-semibold text-foreground">
                {item.categoria}
              </Text>
            </View>

            <Text className="text-sm font-bold text-foreground">
              {item.rango}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
