import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageContentFit } from "expo-image";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { conOpacidad, palette } from "@/shared/theme/palette";
import { useUrlStorage } from "@/features/machines/controller/useStorageUrl";

type PropsAccesibilidad = Pick<
  ViewProps,
  | "accessible"
  | "accessibilityLabel"
  | "accessibilityRole"
  | "accessibilityElementsHidden"
  | "importantForAccessibility"
>;

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
  autoplay?: boolean;
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
  autoplay = true,
}: ImagenStorageProps) {
  const url = useUrlStorage(ruta);
  const imagenRef = useRef<Image>(null);
  // Sin etiqueta la imagen es decorativa (el nombre ya está en el texto
  // contiguo): se oculta para que TalkBack no anuncie «sin etiquetar».
  const propsAccesibilidad: PropsAccesibilidad = accessibilityLabel
    ? { accessible: true, accessibilityLabel, accessibilityRole: "image" }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants",
      };

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (autoplay) void imagenRef.current?.startAnimating();
    else void imagenRef.current?.stopAnimating();
  }, [autoplay]);

  if (url === undefined) {
    return (
      <View
        style={[{ alignItems: "center", justifyContent: "center" }, style]}
        {...propsAccesibilidad}
      >
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
            backgroundColor: conOpacidad(palette.primaryLight, 0.25),
          },
          style,
        ]}
        {...propsAccesibilidad}
      >
        <Ionicons name={iconoVacio} size={28} color={palette.primary} />
      </View>
    );
  }

  return (
    <Image
      ref={imagenRef}
      source={{ uri: url }}
      style={style}
      contentFit={contentFit}
      autoplay={autoplay}
      onLoad={() => {
        if (Platform.OS !== "web" && !autoplay) {
          void imagenRef.current?.stopAnimating();
        }
      }}
      cachePolicy="memory-disk"
      transition={200}
      {...propsAccesibilidad}
    />
  );
}
