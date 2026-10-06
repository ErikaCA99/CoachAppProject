import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageContentFit } from "expo-image";
import { ActivityIndicator, View, type ViewStyle } from "react-native";

import { palette } from "@/constants/palette";
import { useUrlStorage } from "@/hooks/useUrlStorage";

/** Subconjunto de estilos válido tanto para `View` como para `expo-image`. */
type EstiloImagen = Pick<
  ViewStyle,
  "width" | "height" | "aspectRatio" | "borderRadius"
>;

interface ImagenStorageProps {
  /** Ruta en Firebase Storage (`maquinas/...`, `ejercicios/...`). */
  ruta: string | null | undefined;
  style?: EstiloImagen;
  contentFit?: ImageContentFit;
  /** Ícono si no hay imagen o no se pudo cargar. */
  iconoVacio?: React.ComponentProps<typeof Ionicons>["name"];
  accessibilityLabel?: string;
}

/**
 * Imagen (o GIF animado) guardada en Firebase Storage. Usa `expo-image`,
 * que cachea en memoria y disco y reproduce GIFs en Android.
 */
export function ImagenStorage({
  ruta,
  style,
  contentFit = "contain",
  iconoVacio = "barbell-outline",
  accessibilityLabel,
}: ImagenStorageProps) {
  const url = useUrlStorage(ruta);

  if (url === undefined) {
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (url === null) {
    return (
      <View
        style={[
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(173, 217, 209, 0.25)",
          },
          style,
        ]}
      >
        <Ionicons name={iconoVacio} size={28} color={palette.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={200}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
