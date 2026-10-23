import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import type { Maquina } from "@/models/entities/Machine";

export interface SugerenciaMaquina {
  maquina: Maquina;
  /** 0..1 */
  confianza: number;
}

interface HojaSugerenciasMaquinaProps {
  /** Las candidatas del reconocimiento, de más a menos probable. */
  sugerencias: SugerenciaMaquina[];
  onElegir: (maquina: Maquina) => void;
  /** Ninguna acierta: el usuario la busca en el catálogo completo. */
  onNinguna: () => void;
  onReintentar: () => void;
}

/**
 * Hoja inferior del escáner cuando el modelo no está seguro: muestra las
 * tres candidatas más probables (con su foto) para elegir con un toque, en
 * vez de obligar a buscar en toda la lista. La primera lleva la insignia
 * "Más probable"; no se muestran porcentajes porque, con confianza baja,
 * confunden más de lo que ayudan.
 */
export function HojaSugerenciasMaquina({
  sugerencias,
  onElegir,
  onNinguna,
  onReintentar,
}: HojaSugerenciasMaquinaProps) {
  return (
    <View className="rounded-3xl bg-background px-4 pb-4 pt-2.5">
      <View className="mb-3 h-1 w-10 self-center rounded-full bg-primary-light" />

      <Text
        accessibilityRole="header"
        className="text-lg font-bold text-foreground"
      >
        ¿Cuál de estas es?
      </Text>
      <Text className="mb-3 mt-0.5 text-sm text-text-secondary">
        Toca la máquina que tienes enfrente.
      </Text>

      {sugerencias.map(({ maquina }, indice) => (
        <TouchableOpacity
          key={maquina.id}
          accessibilityRole="button"
          accessibilityLabel={`${maquina.nombre}, ${maquina.categoria}${
            indice === 0 ? ", la más probable" : ""
          }`}
          activeOpacity={0.8}
          onPress={() => onElegir(maquina)}
          className="mb-2.5 min-h-[72px] flex-row items-center rounded-2xl border border-border bg-background p-2.5"
        >
          <View className="h-14 w-14 overflow-hidden rounded-xl bg-white">
            <ImagenStorage
              ruta={maquina.imagenPrincipal}
              style={{ width: 56, height: 56 }}
              contentFit="cover"
            />
          </View>
          <View className="ml-3 flex-1">
            {indice === 0 ? (
              <View className="mb-0.5 self-start rounded-full bg-primary px-2 py-0.5">
                <Text className="text-sm font-bold text-background">
                  Más probable
                </Text>
              </View>
            ) : null}
            <Text
              className="text-base font-bold text-foreground"
              numberOfLines={2}
            >
              {maquina.nombre}
            </Text>
            <Text className="text-sm text-text-secondary">
              {maquina.categoria}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.textMuted}
            accessible={false}
          />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={onNinguna}
        className="mt-1 min-h-12 items-center justify-center rounded-2xl border border-border"
      >
        <Text className="text-sm font-bold text-foreground">
          Ninguna de estas
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onReintentar}
        className="mt-1 min-h-11 flex-row items-center justify-center"
      >
        <Ionicons name="refresh" size={16} color={palette.primary} />
        <Text className="ml-1.5 text-sm font-bold text-primary">
          Reintentar escaneo
        </Text>
      </TouchableOpacity>
    </View>
  );
}
