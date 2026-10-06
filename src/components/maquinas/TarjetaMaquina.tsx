import { Text, TouchableOpacity, View } from "react-native";

import { ImagenStorage } from "@/components/maquinas/ImagenStorage";
import type { Maquina } from "@/models/entities/Maquina";

interface TarjetaMaquinaProps {
  maquina: Maquina;
  onPress: () => void;
}

/** Tarjeta del grid de "Guía de Máquinas": foto, nombre y categoría. */
export function TarjetaMaquina({ maquina, onPress }: TarjetaMaquinaProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-primary-light/70 bg-background shadow-sm"
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
          className="text-[13px] font-bold leading-4 text-foreground"
          numberOfLines={2}
        >
          {maquina.nombre}
        </Text>
        <Text className="mt-1 text-[11px] font-semibold text-primary">
          {maquina.categoria}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
