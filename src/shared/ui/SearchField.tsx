import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { TextInput } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";

interface CampoBusquedaProps {
  valor: string;
  onCambiar: (texto: string) => void;
  placeholder: string;
  /** Etiqueta accesible del campo (por defecto, el placeholder). */
  etiqueta?: string;
}

/** Campo de búsqueda de 44 px con botón para borrar; lo comparten catálogo, escáner y selectores. */
export function CampoBusqueda({
  valor,
  onCambiar,
  placeholder,
  etiqueta,
}: CampoBusquedaProps) {
  return (
    <View className="min-h-11 flex-row items-center rounded-2xl border border-primary-light bg-background px-3">
      <Ionicons
        name="search"
        size={18}
        color={palette.textMuted}
        accessible={false}
      />
      <TextInput
        className="ml-2 flex-1 py-2.5 text-sm text-foreground"
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        value={valor}
        onChangeText={onCambiar}
        accessibilityLabel={etiqueta ?? placeholder}
        returnKeyType="search"
        autoCorrect={false}
      />
      {valor.length > 0 ? (
        <Pressable
          onPress={() => onCambiar("")}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={palette.textMuted}
            accessible={false}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
