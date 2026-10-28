import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniaturaEjercicio } from "@/components/routines/ExerciseThumbnail";
import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { CampoBusqueda } from "@/components/ui/SearchField";
import { Text } from "@/components/ui/Typography";
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
  const insets = useSafeAreaInsets();
  const { busqueda, setBusqueda, resultados, cargando } =
    useBuscarEjercicios(visible);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View
        accessibilityViewIsModal
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Text
            accessibilityRole="header"
            className="text-lg font-bold text-foreground"
          >
            Elegir ejercicio
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de ejercicios"
            className="h-11 w-11 items-center justify-center"
            onPress={onCerrar}
          >
            <Ionicons name="close" size={26} color={palette.foreground} />
          </TouchableOpacity>
        </View>

        <View className="mx-5 mb-3">
          <CampoBusqueda
            valor={busqueda}
            onCambiar={setBusqueda}
            placeholder="Buscar ejercicio"
          />
        </View>

        {cargando ? (
          <IndicadorCarga style={{ marginTop: 24 }} color={palette.primary} />
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
                <MiniaturaEjercicio
                  ejercicioId={item.id}
                  imagenUrl={item.imagenUrl}
                  nombre={item.nombre}
                  tamano={48}
                  radio={10}
                />
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {item.nombre}
                  </Text>
                  <Text className="text-sm text-text-muted">
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
