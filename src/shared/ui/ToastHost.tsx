import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import { useReducirMovimiento } from "@/shared/hooks/useReducedMotion";
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
  const ejecutando = useRef(false);

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
    const temporizador = setTimeout(
      ocultar,
      aviso.duracionMs ?? DURACION_MS[aviso.tipo],
    );
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
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion={
            aviso.tipo === "error" ? "assertive" : "polite"
          }
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={aviso.accion?.etiqueta ?? "Cerrar aviso"}
            className="ml-2 min-h-11 min-w-11 items-center justify-center px-2"
            onPress={async () => {
              if (ejecutando.current) return;
              if (!aviso.accion) {
                ocultar();
                return;
              }
              ejecutando.current = true;
              ocultar();
              try {
                await aviso.accion.ejecutar();
              } catch (error) {
                useToastStore
                  .getState()
                  .mostrar(
                    "error",
                    error instanceof Error
                      ? error.message
                      : "No se pudo deshacer. Intenta desde tus rutinas anteriores.",
                  );
              } finally {
                ejecutando.current = false;
              }
            }}
          >
            {aviso.accion ? (
              <Text className="text-sm font-bold text-background">
                {aviso.accion.etiqueta}
              </Text>
            ) : (
              <Ionicons name="close" size={20} color={palette.background} />
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
