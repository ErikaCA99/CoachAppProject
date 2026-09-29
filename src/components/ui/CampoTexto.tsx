import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from "react-native";

import { palette } from "@/constants/palette";

interface CampoTextoProps extends TextInputProps {
  etiqueta: string;
  /** Muestra el botón de ojo y oculta el texto por defecto */
  esContrasena?: boolean;
  error?: string;
}

/** Input con etiqueta en mayúsculas, estilo de los formularios de auth. */
export function CampoTexto({
  etiqueta,
  esContrasena = false,
  error,
  ...inputProps
}: CampoTextoProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        {etiqueta}
      </Text>
      <View className="relative">
        <TextInput
          className={`rounded-xl border bg-background px-4 py-3.5 text-[15px] text-foreground ${
            error ? "border-error" : "border-primary-light"
          } ${esContrasena ? "pr-12" : ""}`}
          placeholderTextColor="#9ca3af"
          secureTextEntry={esContrasena && !visible}
          autoCorrect={false}
          {...inputProps}
        />
        {esContrasena && (
          <TouchableOpacity
            className="absolute bottom-0 right-3 top-0 justify-center"
            onPress={() => setVisible((v) => !v)}
            accessibilityLabel={
              visible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text className="mt-1 text-xs text-error">{error}</Text> : null}
    </View>
  );
}
