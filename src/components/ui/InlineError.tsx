import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

interface ErrorEnLineaProps {
  mensaje: string | null;
}

/**
 * Error de validación o de guardado junto al formulario que lo causó. Se usa
 * en lugar de un diálogo cuando el usuario tiene que corregir un campo, o
 * dentro de un `Modal` (donde los avisos flotantes quedarían tapados).
 */
export function ErrorEnLinea({ mensaje }: ErrorEnLineaProps) {
  if (!mensaje) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="mb-3 flex-row items-start rounded-xl bg-accent-strong/10 p-3"
    >
      <Ionicons
        name="alert-circle"
        size={18}
        color={palette.accentStrong}
        accessible={false}
      />
      <Text className="ml-2 flex-1 text-sm leading-5 text-accent-strong">
        {mensaje}
      </Text>
    </View>
  );
}
