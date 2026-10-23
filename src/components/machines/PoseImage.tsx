import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

/** Proporción base de las imágenes de poses (las hay entre 1,26 y 1,55). */
const PROPORCION_POSES = 1.4;

function EtiquetaPose({ texto }: { texto: string }) {
  return (
    <View className="h-7 justify-center rounded-full bg-primary-light/20 px-3">
      <Text className="text-sm font-bold text-foreground">{texto}</Text>
    </View>
  );
}

/** Fila "1 · Inicio → 2 · Final" que acompaña a una imagen de dos poses. */
export function EtiquetasInicioFinal() {
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <View className="flex-1 items-center">
        <EtiquetaPose texto="1 · Inicio" />
      </View>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
        <Ionicons
          name="arrow-forward"
          size={16}
          color={palette.background}
          accessible={false}
        />
      </View>
      <View className="flex-1 items-center">
        <EtiquetaPose texto="2 · Final" />
      </View>
    </View>
  );
}

interface ImagenPosesProps {
  /** Ruta de Storage de una sola imagen con la pose inicial y la final lado a lado. */
  ruta: string;
  nombre: string;
  /** Explica el color de los músculos (las ilustraciones los marcan en rojo). */
  mostrarLeyenda?: boolean;
}

/**
 * Imagen única con las dos poses del ejercicio (inicio y final) y sus
 * etiquetas fuera de la imagen, para no taparla.
 */
export function ImagenPoses({
  ruta,
  nombre,
  mostrarLeyenda = false,
}: ImagenPosesProps) {
  return (
    <View>
      <View className="overflow-hidden rounded-xl bg-white">
        <ImagenStorage
          ruta={ruta}
          style={{ width: "100%", aspectRatio: PROPORCION_POSES }}
          contentFit="contain"
          iconoVacio="body-outline"
          accessibilityLabel={`${nombre}: pose inicial a la izquierda y pose final a la derecha`}
        />
      </View>
      <EtiquetasInicioFinal />
      {mostrarLeyenda ? (
        <View className="mt-2.5 flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-accent-strong" />
          <Text className="flex-1 text-sm text-text-secondary">
            En rojo, los músculos que trabajan
          </Text>
        </View>
      ) : null}
    </View>
  );
}
