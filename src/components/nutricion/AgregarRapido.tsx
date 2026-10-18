import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import {
  ALIMENTOS_RAPIDOS,
  type AlimentoRapido,
} from "@/controllers/NutritionController";

interface AgregarRapidoProps {
  onAgregar: (alimento: AlimentoRapido) => void;
  deshabilitado?: boolean;
}

export function AgregarRapido({
  onAgregar,
  deshabilitado = false,
}: AgregarRapidoProps) {
  return (
    <View className="mb-5">
      <Text className="mb-2.5 text-xs font-bold tracking-wider text-text-muted">
        AGREGAR RÁPIDO
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {ALIMENTOS_RAPIDOS.map((alimento) => (
          <TouchableOpacity
            key={alimento.id}
            onPress={() => onAgregar(alimento)}
            disabled={deshabilitado}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${alimento.nombre}, ${alimento.calorias} calorías`}
            className="mr-2.5 min-w-[105px] items-center rounded-2xl border border-border/50 bg-white px-3.5 py-3 shadow-xs"
          >
            <Text
              className="text-center text-sm font-semibold text-foreground"
              numberOfLines={1}
            >
              {alimento.nombre}
            </Text>
            <Text className="mt-1 text-center text-xs font-bold text-primary">
              +{alimento.calorias} kcal
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
