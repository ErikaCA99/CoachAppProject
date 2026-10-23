import { Ionicons } from "@expo/vector-icons";
import { Alert, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import type { RegistroNutricional } from "@/models/entities/NutritionRecord";
import type { ConId } from "@/models/types";

interface ListaAlimentosHoyProps {
  alimentos: ConId<RegistroNutricional>[];
  onEliminar: (id: string) => Promise<void>;
  eliminandoId?: string | null;
}

export function ListaAlimentosHoy({
  alimentos,
  onEliminar,
  eliminandoId,
}: ListaAlimentosHoyProps) {
  const confirmarEliminacion = (id: string, nombre?: string) => {
    Alert.alert(
      "Eliminar alimento",
      `¿Deseas eliminar "${nombre ?? "este alimento"}" de tu registro de hoy?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onEliminar(id),
        },
      ],
    );
  };

  if (alimentos.length === 0) {
    return (
      <View className="items-center justify-center rounded-3xl border border-dashed border-border/60 bg-white/50 p-8">
        <Ionicons
          name="restaurant-outline"
          size={36}
          color={palette.primaryLight}
        />
        <Text className="mt-3 text-center text-sm font-medium text-text-muted">
          Aún no registraste ningún alimento hoy.
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-6">
      <Text className="mb-2.5 text-sm font-bold tracking-wider text-text-muted">
        ALIMENTOS REGISTRADOS HOY ({alimentos.length})
      </Text>
      <View className="gap-2.5">
        {alimentos.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center justify-between rounded-2xl border border-border/40 bg-white p-3.5 shadow-xs"
          >
            {/* Detalle del alimento */}
            <View className="flex-1 pr-3">
              <Text
                className="text-sm font-bold text-foreground"
                numberOfLines={1}
              >
                {item.alimento}
              </Text>
              <Text className="mt-0.5 text-sm text-text-muted">
                {item.cantidad ? `${item.cantidad} · ` : ""}P:{" "}
                {item.proteinas ?? 0}g · C: {item.carbohidratos ?? 0}g · G:{" "}
                {item.grasas ?? 0}g
              </Text>
            </View>

            {/* Calorías y botón eliminar */}
            <View className="flex-row items-center gap-3">
              <View className="rounded-full bg-primary/10 px-2.5 py-1">
                <Text className="text-sm font-bold text-primary">
                  +{item.calorias} kcal
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => confirmarEliminacion(item.id, item.alimento)}
                disabled={eliminandoId === item.id}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.alimento}`}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={palette.accentStrong}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
