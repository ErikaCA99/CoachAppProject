import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

/** Cuántos consejos de prevención se destacan en el recuadro. */
const MAX_CLAVES = 3;

interface ClavesSeguridadProps {
  /** Consejos de prevención de la máquina; se muestran los primeros tres. */
  puntos: string[];
}

/** Recuadro "Claves para no lastimarte" con los consejos más importantes. */
export function ClavesSeguridad({ puntos }: ClavesSeguridadProps) {
  if (puntos.length === 0) return null;

  return (
    <View className="rounded-2xl border-2 border-primary p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons
          name="shield-checkmark-outline"
          size={20}
          color={palette.primary}
          accessible={false}
        />
        <Text
          accessibilityRole="header"
          className="text-base font-bold text-foreground"
        >
          Claves para no lastimarte
        </Text>
      </View>
      {puntos.slice(0, MAX_CLAVES).map((clave, i) => (
        <View key={i} className="mb-1.5 flex-row">
          <Text className="mr-2 text-sm leading-6 text-primary">•</Text>
          <Text className="flex-1 text-sm leading-6 text-foreground">
            {clave}
          </Text>
        </View>
      ))}
    </View>
  );
}
