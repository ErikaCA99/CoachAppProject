import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { palette } from "@/constants/palette";
import type { Maquina } from "@/models/entities/Machine";

interface TarjetaSeleccionEscaneoProps {
  maquina: Maquina | null;
  /** Confianza (0..1) si la máquina es la sugerida por el reconocimiento. */
  confianzaSugerencia: number | null;
}

/**
 * Cabecera de la hoja de confirmación: muestra la máquina identificada o
 * elegida con una insignia de estado clara, en vez de una pregunta genérica.
 */
export function TarjetaSeleccionEscaneo({
  maquina,
  confianzaSugerencia,
}: TarjetaSeleccionEscaneoProps) {
  if (!maquina) {
    return (
      <View className="flex-row items-center rounded-2xl bg-primary-light/25 p-3">
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-background">
          <Ionicons name="scan-outline" size={26} color={palette.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-foreground">
            ¿Qué máquina es?
          </Text>
          <Text className="mt-0.5 text-xs leading-4 text-text-muted">
            El reconocimiento automático aún está en desarrollo. Elígela en la
            lista.
          </Text>
        </View>
      </View>
    );
  }

  const esSugerencia = confianzaSugerencia !== null;

  return (
    <View
      className="flex-row items-center rounded-2xl bg-primary-light/25 p-3"
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${
        esSugerencia ? "Máquina sugerida" : "Máquina seleccionada"
      }: ${maquina.nombre}, ${maquina.categoria}`}
    >
      <View className="overflow-hidden rounded-xl bg-white">
        <ImagenStorage
          ruta={maquina.imagenPrincipal}
          style={{ width: 56, height: 56 }}
        />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className="text-base font-bold leading-5 text-foreground"
          numberOfLines={2}
        >
          {maquina.nombre}
        </Text>
        <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
          {esSugerencia ? (
            <View className="flex-row items-center rounded-full bg-secondary px-2 py-0.5">
              <Ionicons
                name="sparkles"
                size={11}
                color={palette.accentStrong}
              />
              <Text className="ml-1 text-[11px] font-bold text-foreground">
                Sugerida · {Math.round(confianzaSugerencia * 100)} %
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center rounded-full bg-primary px-2 py-0.5">
              <Ionicons name="checkmark-circle" size={12} color="#ffffff" />
              <Text className="ml-1 text-[11px] font-bold text-white">
                Seleccionada
              </Text>
            </View>
          )}
          <Text className="text-[11px] font-semibold text-primary">
            {maquina.categoria}
          </Text>
        </View>
      </View>
    </View>
  );
}
