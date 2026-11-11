import { View, type TextInputProps } from "react-native";

import { Text, TextInput, type TextInputRef } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";

interface CampoFormularioProps extends Omit<TextInputProps, "style"> {
  /** Etiqueta visible; también es la etiqueta accesible del campo. */
  etiqueta: string;
  /** Etiqueta en mayúsculas pequeñas (formularios densos como el de alimentos). */
  mayusculas?: boolean;
  /** Texto centrado (campos numéricos cortos). */
  centrado?: boolean;
  inputRef?: React.Ref<TextInputRef>;
}

/**
 * Campo con etiqueta para formularios dentro de la app (alimentos, medidas,
 * peso...). Garantiza que el lector de pantalla anuncie la etiqueta y que
 * todos los campos compartan alto (≥ 44 px), borde y marcador legible.
 */
export function CampoFormulario({
  etiqueta,
  mayusculas = false,
  centrado = false,
  inputRef,
  ...inputProps
}: CampoFormularioProps) {
  return (
    <View>
      <Text
        className={`mb-1.5 text-sm text-text-secondary ${
          mayusculas ? "font-bold uppercase tracking-wider" : "font-semibold"
        }`}
      >
        {etiqueta}
      </Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={etiqueta}
        placeholderTextColor={palette.textMuted}
        className={`min-h-12 rounded-xl border border-border bg-primary-light/10 px-3.5 text-base text-foreground ${
          centrado ? "text-center font-semibold" : ""
        }`}
        {...inputProps}
      />
    </View>
  );
}
