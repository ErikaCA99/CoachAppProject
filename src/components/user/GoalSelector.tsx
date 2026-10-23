import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import {
  OBJETIVOS_USUARIO,
  type ObjetivoUsuario,
} from "@/models/entities/User";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const OBJETIVOS = Object.entries(OBJETIVOS_USUARIO) as [
  ObjetivoUsuario,
  (typeof OBJETIVOS_USUARIO)[ObjetivoUsuario],
][];

interface SelectorObjetivoProps {
  valor: ObjetivoUsuario | null | undefined;
  onCambiar: (objetivo: ObjetivoUsuario) => void;
  /**
   * `tarjetas`: dos columnas con ícono (onboarding y generar rutina).
   * `compacta`: píldoras en fila (Perfil).
   */
  variante?: "tarjetas" | "compacta";
}

/**
 * Selector único del objetivo del usuario. Se usa en el onboarding, al
 * generar una rutina y en Perfil, para que las tres pantallas se vean y
 * se comporten igual.
 */
export function SelectorObjetivo({
  valor,
  onCambiar,
  variante = "tarjetas",
}: SelectorObjetivoProps) {
  const compacta = variante === "compacta";

  return (
    <View
      accessibilityRole="radiogroup"
      className={
        compacta
          ? "flex-row flex-wrap gap-2"
          : "flex-row flex-wrap justify-between"
      }
    >
      {OBJETIVOS.map(([clave, info]) => {
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
            className={`mb-3 min-h-14 w-[48.5%] flex-row items-center rounded-xl border px-3 py-3 active:opacity-80 ${
              activo
                ? "border-primary bg-primary-light/30"
                : "border-primary-light bg-background"
            }`}
            onPress={() => onCambiar(clave)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
          >
            <Ionicons
              name={info.icono as IoniconName}
              size={20}
              color={activo ? palette.primary : palette.textSecondary}
            />
            <Text
              className={`ml-2 flex-1 text-sm ${
                activo ? "font-semibold text-primary" : "text-foreground"
              }`}
              numberOfLines={2}
            >
              {info.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
