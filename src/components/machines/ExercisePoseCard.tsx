import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

import { ImagenPoses } from "@/components/machines/PoseImage";
import { ImagenStorage } from "@/components/machines/StorageImage";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import type {
  DificultadEjercicio,
  EjercicioGif,
} from "@/models/entities/Machine";

const ESTILO_DIFICULTAD: Record<
  DificultadEjercicio,
  { fondo: string; texto: string }
> = {
  Principiante: { fondo: "bg-success/15", texto: "text-success" },
  Intermedio: { fondo: "bg-warning/40", texto: "text-accent-strong" },
  Avanzado: { fondo: "bg-accent-strong/15", texto: "text-accent-strong" },
};

interface TarjetaPosesEjercicioProps {
  ejercicio: EjercicioGif;
  /** Rutas de las fotos de posición inicial y final (puede venir vacío). */
  poses: string[];
  onPress: () => void;
}

function Pose({
  ruta,
  etiqueta,
  nombre,
}: {
  ruta: string;
  etiqueta: string;
  nombre: string;
}) {
  return (
    <View className="flex-1 items-center">
      <View className="w-full overflow-hidden rounded-xl bg-white">
        <ImagenStorage
          ruta={ruta}
          style={{ width: "100%", aspectRatio: 1 }}
          accessibilityLabel={`${nombre}: posición ${etiqueta.toLowerCase()}`}
        />
      </View>
      <Text className="mt-1.5 text-sm font-bold text-foreground">
        {etiqueta}
      </Text>
    </View>
  );
}

/**
 * Un ejercicio de la máquina mostrado como en una guía impresa: foto de la
 * posición inicial → flecha → foto de la posición final. Prefiere la imagen
 * única con las dos poses; si el catálogo no la trae usa las dos fotos y, si
 * tampoco están, la animación.
 */
export function TarjetaPosesEjercicio({
  ejercicio,
  poses,
  onPress,
}: TarjetaPosesEjercicioProps) {
  const dificultad = ESTILO_DIFICULTAD[ejercicio.dificultad];
  const tienePoses = poses.length >= 2;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver cómo hacer ${ejercicio.nombre}`}
      activeOpacity={0.85}
      onPress={onPress}
      className="mb-4 rounded-2xl border border-border bg-background p-4"
    >
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-foreground">
            {ejercicio.nombre}
          </Text>
          <Text className="mt-0.5 text-sm text-text-secondary">
            {ejercicio.musculoObjetivo}
          </Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${dificultad.fondo}`}>
          <Text className={`text-sm font-bold ${dificultad.texto}`}>
            {ejercicio.dificultad}
          </Text>
        </View>
      </View>

      {ejercicio.imagenPoses ? (
        <ImagenPoses ruta={ejercicio.imagenPoses} nombre={ejercicio.nombre} />
      ) : tienePoses ? (
        <View className="flex-row items-start gap-2">
          <Pose ruta={poses[0]} etiqueta="Inicio" nombre={ejercicio.nombre} />
          <View className="mt-10 h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Ionicons
              name="arrow-forward"
              size={18}
              color={palette.background}
              accessible={false}
            />
          </View>
          <Pose ruta={poses[1]} etiqueta="Final" nombre={ejercicio.nombre} />
        </View>
      ) : (
        <View className="overflow-hidden rounded-xl bg-white">
          <ImagenStorage
            ruta={ejercicio.gifPath}
            style={{ width: "100%", aspectRatio: 1.6 }}
            iconoVacio="film-outline"
            accessibilityLabel={`Animación: ${ejercicio.nombre}`}
          />
        </View>
      )}

      <View className="mt-3 min-h-11 flex-row items-center justify-center gap-1 rounded-xl bg-primary-light/25">
        <Text className="text-sm font-bold text-primary">
          Ver animación y pasos
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.primary}
          accessible={false}
        />
      </View>
    </TouchableOpacity>
  );
}
