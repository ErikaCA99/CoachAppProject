import { Pressable } from "react-native";

import { Text } from "@/components/ui/Typography";

interface ChipFiltroProps {
  texto: string;
  activo: boolean;
  onPress: () => void;
}

export function ChipFiltro({ texto, activo, onPress }: ChipFiltroProps) {
  return (
    <Pressable
      className={`mr-2 min-h-11 justify-center rounded-full px-3.5 active:scale-95 active:opacity-80 ${
        activo ? "bg-primary" : "bg-primary-light/30"
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
    >
      <Text
        className={`text-sm font-semibold ${
          activo ? "text-background" : "text-text-secondary"
        }`}
      >
        {texto}
      </Text>
    </Pressable>
  );
}
