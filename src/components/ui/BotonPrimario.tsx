import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { palette } from "@/constants/palette";

interface BotonPrimarioProps {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Ícono opcional a la derecha del texto */
  icono?: ReactNode;
}

/** Botón principal con degradado verde; gris cuando está deshabilitado. */
export function BotonPrimario({
  titulo,
  onPress,
  cargando = false,
  deshabilitado = false,
  icono,
}: BotonPrimarioProps) {
  const inactivo = deshabilitado || cargando;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      className="rounded-2xl shadow-sm"
    >
      <LinearGradient
        colors={
          deshabilitado
            ? ["#a3aeab", "#a3aeab"]
            : [palette.primary, palette.primaryDark]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: cargando ? 0.8 : 1,
        }}
      >
        {cargando ? (
          <ActivityIndicator color={palette.background} />
        ) : (
          <>
            <Text className="text-base font-bold text-background">
              {titulo}
            </Text>
            {icono ? <View className="ml-2">{icono}</View> : null}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
