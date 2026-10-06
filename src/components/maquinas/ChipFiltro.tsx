import { Text, TouchableOpacity } from "react-native";

interface ChipFiltroProps {
  texto: string;
  activo: boolean;
  onPress: () => void;
}

export function ChipFiltro({ texto, activo, onPress }: ChipFiltroProps) {
  return (
    <TouchableOpacity
      className={`mr-2 rounded-full px-3.5 py-1.5 ${
        activo ? "bg-primary" : "bg-primary-light/30"
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
    >
      <Text
        className={`text-xs font-semibold ${
          activo ? "text-background" : "text-text-secondary"
        }`}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}
