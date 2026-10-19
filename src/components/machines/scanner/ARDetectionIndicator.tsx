import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { palette } from "@/constants/palette";
import type { Maquina } from "@/models/entities/Machine";

interface IndicadorDeteccionARProps {
  maquina: Maquina;
  /** Texto corto del estado: "Sugerencia · 62 %", "Tu selección", "Confirmada"... */
  etiqueta: string;
  /** `true` cuando la máquina ya fue confirmada (cambia el ícono de estado). */
  confirmada: boolean;
}

/**
 * Píldora flotante sobre la cámara con la miniatura de la máquina detectada
 * o seleccionada y el ícono de modelo 3D: da contexto visual del escaneo.
 */
export function IndicadorDeteccionAR({
  maquina,
  etiqueta,
  confirmada,
}: IndicadorDeteccionARProps) {
  return (
    <View
      className="flex-row items-center self-center rounded-2xl bg-black/60 p-1.5 pr-2"
      accessible
      accessibilityLabel={`${etiqueta}: ${maquina.nombre}`}
      accessibilityLiveRegion="polite"
    >
      <View className="overflow-hidden rounded-xl bg-white">
        <ImagenStorage
          ruta={maquina.imagenPrincipal}
          style={{ width: 42, height: 42 }}
        />
      </View>
      <View className="ml-2.5 max-w-[200px]">
        <View className="flex-row items-center">
          <Ionicons
            name={confirmada ? "checkmark-circle" : "radio-button-on"}
            size={12}
            color={confirmada ? palette.primaryLight : palette.secondary}
          />
          <Text className="ml-1 text-xs font-semibold text-white/80">
            {etiqueta}
          </Text>
        </View>
        <Text className="text-[13px] font-bold text-white" numberOfLines={1}>
          {maquina.nombre}
        </Text>
      </View>
      <View className="ml-3 h-9 w-9 items-center justify-center rounded-xl bg-white/15">
        <MaterialCommunityIcons name="cube-scan" size={20} color="#ffffff" />
      </View>
    </View>
  );
}
