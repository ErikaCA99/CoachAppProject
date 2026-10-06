import { Text, TouchableOpacity, View } from "react-native";

import { ImagenStorage } from "@/components/maquinas/ImagenStorage";
import type {
  DificultadEjercicio,
  EjercicioGif,
} from "@/models/entities/Maquina";

const COLOR_DIFICULTAD: Record<DificultadEjercicio, string> = {
  Principiante: "bg-success/15 text-success",
  Intermedio: "bg-warning/40 text-accent-strong",
  Avanzado: "bg-accent-strong/15 text-accent-strong",
};

/** GIF de uso correcto de un ejercicio (WorkoutX) con su dificultad. */
export function TarjetaEjercicioGif({
  ejercicio,
  onPress,
}: {
  ejercicio: EjercicioGif;
  onPress?: () => void;
}) {
  const [fondo, texto] = COLOR_DIFICULTAD[ejercicio.dificultad].split(" ");
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={
        onPress ? `Ver detalle del ejercicio ${ejercicio.nombre}` : undefined
      }
      className="mr-3 w-44 overflow-hidden rounded-2xl border border-primary-light/70 bg-background"
    >
      <View className="bg-white">
        <ImagenStorage
          ruta={ejercicio.gifPath}
          style={{ width: "100%", aspectRatio: 1 }}
          iconoVacio="film-outline"
          accessibilityLabel={`Animación: ${ejercicio.nombre}`}
        />
      </View>
      <View className="p-2.5">
        <Text
          className="text-[12px] font-bold leading-4 text-foreground"
          numberOfLines={2}
        >
          {ejercicio.nombre}
        </Text>
        <View className={`mt-1.5 self-start rounded-full px-2 py-0.5 ${fondo}`}>
          <Text className={`text-[10px] font-bold ${texto}`}>
            {ejercicio.dificultad}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
