import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { useBuscarEjercicios } from "@/hooks/useExerciseSearch";
import type { EjercicioWger } from "@/models/entities/WgerExercise";

/** Modal de búsqueda para elegir un ejercicio del catálogo de máquinas. */
export function SelectorEjercicios({
  visible,
  onCerrar,
  onSeleccionar,
}: {
  visible: boolean;
  onCerrar: () => void;
  onSeleccionar: (ejercicio: EjercicioWger) => void;
}) {
  const { busqueda, setBusqueda, resultados, cargando } =
    useBuscarEjercicios(visible);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View className="flex-1 bg-background pt-14">
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Text className="text-lg font-bold text-foreground">
            Elegir ejercicio
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de ejercicios"
            hitSlop={12}
            onPress={onCerrar}
          >
            <Ionicons name="close" size={26} color={palette.foreground} />
          </TouchableOpacity>
        </View>

        <View className="mx-5 mb-3 flex-row items-center rounded-2xl border border-border bg-primary-light/20 px-3">
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-sm text-foreground"
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#6b7280"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {cargando ? (
          <ActivityIndicator
            style={{ marginTop: 24 }}
            color={palette.primary}
          />
        ) : (
          <FlatList
            data={resultados}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 20, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                className="mb-2.5 flex-row items-center rounded-xl border border-border p-2.5"
                onPress={() => onSeleccionar(item)}
              >
                {item.imagenUrl ? (
                  <Image
                    source={{ uri: item.imagenUrl }}
                    className="h-12 w-12 rounded-lg"
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary-light/40">
                    <Ionicons
                      name="barbell-outline"
                      size={18}
                      color={palette.primary}
                    />
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {item.nombre}
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {item.categoria}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={palette.primary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text className="mt-10 text-center text-sm text-text-muted">
                No se encontraron ejercicios.
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}
