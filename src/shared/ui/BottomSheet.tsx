import { Ionicons } from "@expo/vector-icons";
import { useMemo, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
  type DimensionValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import { useReducirMovimiento } from "@/shared/hooks/useReducedMotion";

interface HojaInferiorProps {
  visible: boolean;
  onCerrar: () => void;
  /** Título de la hoja; si falta, no se dibuja la cabecera. */
  titulo?: string;
  /** Etiqueta accesible del fondo y del botón de cerrar. */
  etiquetaCerrar?: string;
  /** Altura máxima de la hoja (por defecto 88 %). */
  alturaMaxima?: DimensionValue;
  children: ReactNode;
}

/**
 * Hoja inferior reutilizable (Modal): fondo que cierra al tocar, asa que se
 * arrastra hacia abajo, cabecera opcional con cerrar de 44 px, área segura,
 * teclado y respeto a "reducir movimiento". Un `Modal` tapa los avisos
 * flotantes: dentro de la hoja, usa errores en línea.
 */
export function HojaInferior({
  visible,
  onCerrar,
  titulo,
  etiquetaCerrar = "Cerrar",
  alturaMaxima = "88%",
  children,
}: HojaInferiorProps) {
  const insets = useSafeAreaInsets();
  const reducirMovimiento = useReducirMovimiento();

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dx) < 20,
        onPanResponderRelease: (_, g) => {
          if (g.dy > 60) onCerrar();
        },
      }),
    [onCerrar],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducirMovimiento ? "none" : "slide"}
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable
          className="flex-1"
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel={etiquetaCerrar}
        />
        <View
          accessibilityViewIsModal
          className="rounded-t-3xl bg-background px-5"
          style={{
            maxHeight: alturaMaxima,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View
            {...gesto.panHandlers}
            accessible={false}
            className="items-center py-3"
          >
            <View className="h-1 w-10 rounded-full bg-primary-light" />
          </View>

          {titulo ? (
            <View className="mb-3 flex-row items-center justify-between">
              <Text
                accessibilityRole="header"
                className="flex-1 pr-2 text-xl font-bold text-foreground"
              >
                {titulo}
              </Text>
              <TouchableOpacity
                onPress={onCerrar}
                accessibilityRole="button"
                accessibilityLabel={etiquetaCerrar}
                className="h-11 w-11 items-center justify-center rounded-full bg-primary-light/30"
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={palette.foreground}
                  accessible={false}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
