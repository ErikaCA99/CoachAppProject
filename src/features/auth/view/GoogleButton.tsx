import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";

interface BotonGoogleProps {
  onPress: () => void;
  deshabilitado?: boolean;
}

export function BotonGoogle({ onPress, deshabilitado }: BotonGoogleProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="flex-row items-center justify-center rounded-2xl border border-primary-light bg-background py-3.5 shadow-sm"
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityState={{ disabled: deshabilitado }}
      style={deshabilitado ? { opacity: 0.6 } : undefined}
      accessibilityRole="button"
    >
      <Ionicons name="logo-google" size={18} color={palette.foreground} />
      <Text className="ml-3 text-[15px] font-semibold text-foreground">
        Continuar con Google
      </Text>
    </TouchableOpacity>
  );
}
