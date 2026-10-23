import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import {
  NIVELES_EXPERIENCIA,
  type NivelExperiencia,
} from "@/models/entities/User";

const NIVELES = Object.entries(NIVELES_EXPERIENCIA) as [
  NivelExperiencia,
  (typeof NIVELES_EXPERIENCIA)[NivelExperiencia],
][];

interface SelectorNivelProps {
  valor: NivelExperiencia | null | undefined;
  onCambiar: (nivel: NivelExperiencia) => void;
  /**
   * `tarjetas`: una tarjeta por nivel con su descripción (onboarding y
   * generar rutina). `compacta`: píldoras en fila (Perfil).
   */
  variante?: "tarjetas" | "compacta";
}

/**
 * Selector único del nivel de experiencia. Mismo criterio que
 * `SelectorObjetivo`: una sola implementación para las tres pantallas.
 */
export function SelectorNivel({
  valor,
  onCambiar,
  variante = "tarjetas",
}: SelectorNivelProps) {
  const compacta = variante === "compacta";

  return (
    <View
      accessibilityRole="radiogroup"
      className={compacta ? "flex-row flex-wrap gap-2" : undefined}
    >
      {NIVELES.map(([clave, info]) => {
        const activo = valor === clave;

        if (compacta) {
          return (
            <Pressable
              key={clave}
              className={`min-h-11 items-center justify-center rounded-full border px-4 py-2.5 active:scale-95 active:opacity-80 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              onPress={() => onCambiar(clave)}
            >
              <Text
                className={`text-sm font-semibold ${
                  activo ? "text-background" : "text-foreground"
                }`}
              >
                {info.etiqueta}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={clave}
            className={`mb-3 flex-row items-center rounded-xl border p-4 active:opacity-80 ${
              activo
                ? "border-primary bg-primary-light/30"
                : "border-primary-light bg-background"
            }`}
            onPress={() => onCambiar(clave)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
          >
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                {info.etiqueta}
              </Text>
              <Text className="mt-1 text-sm text-text-muted">
                {info.descripcion}
              </Text>
            </View>
            {activo ? (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={palette.primary}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
