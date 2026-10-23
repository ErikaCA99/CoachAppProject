import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { useReducirMovimiento } from "@/hooks/useReducedMotion";
import { useToastStore, type TipoAviso } from "@/store/toast.store";

type NombreIcono = ComponentProps<typeof Ionicons>["name"];

/** Los errores duran más: hay que dar tiempo a leerlos. */
const DURACION_MS: Record<TipoAviso, number> = {
  exito: 3000,
  info: 3500,
  error: 5000,
};

// Fondos con contraste ≥ 4,5:1 contra el texto blanco.
const ESTILO: Record<TipoAviso, { fondo: string; icono: NombreIcono }> = {
  exito: { fondo: palette.primary, icono: "checkmark-circle" },
  error: { fondo: palette.accentStrong, icono: "alert-circle" },
  info: { fondo: palette.foreground, icono: "information-circle" },
};

/**
 * Muestra el aviso activo del store de avisos. Va una sola vez en el layout
 * raíz, por encima de todas las pantallas. Un toque lo descarta.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const aviso = useToastStore((s) => s.aviso);
  const ocultar = useToastStore((s) => s.ocultar);
  const [entrada] = useState(() => new Animated.Value(0));
  const reducir = useReducirMovimiento();

  useEffect(() => {
    if (!aviso) return;
    entrada.setValue(reducir ? 1 : 0);
    const animacion = Animated.timing(entrada, {
      toValue: 1,
      duration: reducir ? 0 : 180,
      useNativeDriver: true,
      isInteraction: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [aviso, entrada, reducir]);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(ocultar, DURACION_MS[aviso.tipo]);
    return () => clearTimeout(temporizador);
  }, [aviso, ocultar]);

  if (!aviso) return null;
  const estilo = ESTILO[aviso.tipo];

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-4"
      style={{ top: insets.top + 8 }}
    >
      <Animated.View
        style={{
          opacity: entrada,
          transform: [
            {
              translateY: entrada.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          onPress={ocultar}
          accessibilityRole="alert"
          accessibilityLiveRegion={
            aviso.tipo === "error" ? "assertive" : "polite"
          }
          accessibilityHint="Toca para cerrar el aviso"
          className="min-h-12 flex-row items-center rounded-2xl px-4 py-3 shadow-lg"
          style={{ backgroundColor: estilo.fondo, elevation: 6 }}
        >
          <Ionicons
            name={estilo.icono}
            size={22}
            color={palette.background}
            accessible={false}
          />
          <Text className="ml-3 flex-1 text-sm font-semibold text-background">
            {aviso.mensaje}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
