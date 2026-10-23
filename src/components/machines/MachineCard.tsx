import { Animated, Pressable, View } from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { Text } from "@/components/ui/Typography";
import type { Maquina } from "@/models/entities/Machine";
import { useAnimacionPresion } from "@/hooks/usePressAnimation";

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

interface TarjetaMaquinaProps {
  maquina: Maquina;
  onPress: () => void;
}

/** Tarjeta del grid de "Guía de Máquinas": foto, nombre y categoría. */
export function TarjetaMaquina({ maquina, onPress }: TarjetaMaquinaProps) {
  const presion = useAnimacionPresion();
  return (
    <PressableAnimado
      onPress={onPress}
      onPressIn={presion.onPressIn}
      onPressOut={presion.onPressOut}
      style={presion.estilo}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-primary-light/70 bg-background shadow-sm active:opacity-90"
      accessibilityRole="button"
      accessibilityLabel={`${maquina.nombre}, ${maquina.categoria}`}
    >
      <View className="bg-white">
        <ImagenStorage
          ruta={maquina.imagenPrincipal}
          style={{ width: "100%", aspectRatio: 1 }}
          accessibilityLabel={maquina.nombre}
        />
      </View>
      <View className="px-3 pb-3 pt-2">
        <Text
          className="text-sm font-bold leading-5 text-foreground"
          numberOfLines={2}
        >
          {maquina.nombre}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-primary">
          {maquina.categoria}
        </Text>
      </View>
    </PressableAnimado>
  );
}
