import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";

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
      style={deshabilitado ? { opacity: 0.6 } : undefined}
      accessibilityRole="button"
    >
      <Ionicons name="logo-google" size={18} color="#4285F4" />
      <Text className="ml-3 text-[15px] font-semibold text-foreground">
        Continuar con Google
      </Text>
    </TouchableOpacity>
  );
}
