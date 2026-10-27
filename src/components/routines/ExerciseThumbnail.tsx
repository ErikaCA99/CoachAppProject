import { Image, View } from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { Text } from "@/components/ui/Typography";
import { useImagenRespaldoWger } from "@/hooks/useWgerExerciseImage";

interface MiniaturaEjercicioProps {
  /** Id del ejercicio en wger (`EjercicioRutina.maquinaId`). */
  ejercicioId: number;
  /** Imagen que ya trae wger; si existe, se usa tal cual. */
  imagenUrl: string | null;
  nombre: string;
  /** Lado de la miniatura en px. */
  tamano: number;
  radio?: number;
}

/**
 * Miniatura cuadrada de un ejercicio de rutina: la foto de wger si la hay;
 * si no, la foto libre del catálogo propio (`ejerciciosWger`); si tampoco,
 * el ícono de mancuerna.
 */
export function MiniaturaEjercicio({
  ejercicioId,
  imagenUrl,
  nombre,
  tamano,
  radio = 8,
}: MiniaturaEjercicioProps) {
  const respaldo = useImagenRespaldoWger(ejercicioId, !imagenUrl);
  const estilo = { width: tamano, height: tamano, borderRadius: radio };

  if (imagenUrl) {
    return (
      <Image
        source={{ uri: imagenUrl }}
        style={estilo}
        accessibilityLabel={nombre}
      />
    );
  }
  const ruta = respaldo?.imagenes[0] ?? respaldo?.miniatura ?? null;
  return (
    <ImagenStorage
      ruta={ruta}
      style={estilo}
      contentFit="cover"
      autoplay={false}
      accessibilityLabel={nombre}
    />
  );
}

interface DemostracionRutinaProps {
  ejercicioId: number;
  imagenUrl: string | null;
  nombre: string;
}

/**
 * Demostración grande (pantalla de entrenamiento): imagen de wger o, si no
 * hay, el GIF animado / la foto del catálogo propio. Al usar material de
 * Gym Visual se muestra su atribución, como exige su licencia.
 */
export function DemostracionRutina({
  ejercicioId,
  imagenUrl,
  nombre,
}: DemostracionRutinaProps) {
  const respaldo = useImagenRespaldoWger(ejercicioId, !imagenUrl);

  if (imagenUrl) {
    return (
      <Image
        source={{ uri: imagenUrl }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
        accessibilityLabel={`Demostración de ${nombre}`}
      />
    );
  }
  const usaGif = respaldo?.gif != null;
  const ruta = respaldo?.gif ?? respaldo?.imagenes[0] ?? null;
  return (
    <View style={{ width: "100%", height: "100%" }}>
      <ImagenStorage
        ruta={ruta}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        iconoVacio="barbell-outline"
        accessibilityLabel={`Demostración de ${nombre}`}
      />
      {usaGif && respaldo?.atribucionGymVisual ? (
        <Text className="absolute bottom-1 right-2 text-[10px] text-text-muted">
          {respaldo.atribucionGymVisual}
        </Text>
      ) : null}
    </View>
  );
}
