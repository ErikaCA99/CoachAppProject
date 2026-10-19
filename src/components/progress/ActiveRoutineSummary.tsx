import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import { palette } from "@/constants/palette";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
} from "@/models/entities/User";
import type { Rutina } from "@/models/entities/Routine";

interface RutinaActivaResumenProps {
  rutina: Rutina;
}

/** Tarjeta hero con degradado para la rutina activa: nombre + badges de objetivo/nivel/días. */
export function RutinaActivaResumen({ rutina }: RutinaActivaResumenProps) {
  const badges = [
    rutina.objetivo ? OBJETIVOS_USUARIO[rutina.objetivo].etiqueta : null,
    rutina.nivel ? NIVELES_EXPERIENCIA[rutina.nivel].etiqueta : null,
    `${rutina.diasPorSemana} días`,
  ].filter((b): b is string => !!b);

  return (
    <LinearGradient
      colors={[palette.primary, palette.accent, palette.accentStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 20, padding: 20 }}
    >
      <Text className="text-[11px] font-bold uppercase tracking-wider text-background/80">
        Rutina activa
      </Text>
      <Text className="mb-3 mt-0.5 text-lg font-bold text-background">
        {rutina.nombre}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {badges.map((badge) => (
          <View key={badge} className="rounded-full bg-background/20 px-3 py-1">
            <Text className="text-xs font-semibold text-background">
              {badge}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}
