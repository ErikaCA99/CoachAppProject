import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MachinesController";
import type { EjercicioGif } from "@/models/entities/Machine";

type EstadoAlternativa =
  | { tipo: "inicial" | "cargando" | "vacio" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "lista"; url: string };

/** WorkoutX sigue siendo la fuente principal; ExerciseDB se consulta a petición. */
export function DemostracionEjercicio({
  ejercicio,
  alto,
  reproduciendo,
}: {
  ejercicio: EjercicioGif;
  alto: number;
  reproduciendo: boolean;
}) {
  const [fuente, setFuente] = useState<"workoutx" | "exercisedb">("workoutx");
  const [alternativa, setAlternativa] = useState<EstadoAlternativa>({
    tipo: "inicial",
  });
  const solicitud = useRef<AbortController | null>(null);
  const imagen = useRef<Image>(null);

  useEffect(() => () => solicitud.current?.abort(), []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (reproduciendo) void imagen.current?.startAnimating();
    else void imagen.current?.stopAnimating();
  }, [reproduciendo]);

  const consultar = async () => {
    solicitud.current?.abort();
    const cancelacion = new AbortController();
    solicitud.current = cancelacion;
    setFuente("exercisedb");
    setAlternativa({ tipo: "cargando" });
    try {
      const resultado = await MaquinasController.obtenerAnimacionAlternativa(
        ejercicio,
        cancelacion.signal,
      );
      if (cancelacion.signal.aborted) return;
      setAlternativa(
        resultado ? { tipo: "lista", url: resultado.url } : { tipo: "vacio" },
      );
    } catch (error) {
      if (cancelacion.signal.aborted) return;
      setAlternativa({
        tipo: "error",
        mensaje:
          error instanceof Error && error.message.includes("límite")
            ? error.message
            : "No se pudo cargar ExerciseDB. Comprueba tu conexión e inténtalo de nuevo.",
      });
    }
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-2 px-3 pt-3">
        {(["workoutx", "exercisedb"] as const).map((opcion) => (
          <TouchableOpacity
            key={opcion}
            accessibilityRole="button"
            accessibilityState={{ selected: fuente === opcion }}
            onPress={() => {
              if (opcion === "exercisedb") void consultar();
              else {
                solicitud.current?.abort();
                setFuente("workoutx");
              }
            }}
            className={`min-h-12 justify-center rounded-xl px-4 ${fuente === opcion ? "bg-primary" : "bg-primary-light/20"}`}
          >
            <Text
              className={`text-sm font-semibold ${fuente === opcion ? "text-background" : "text-primary"}`}
            >
              {opcion === "workoutx" ? "WorkoutX" : "ExerciseDB"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {fuente === "workoutx" ? (
        <ImagenStorage
          ruta={ejercicio.gifPath}
          style={{ width: "100%", height: alto }}
          autoplay={reproduciendo}
          iconoVacio="film-outline"
          accessibilityLabel={`Demostración WorkoutX de ${ejercicio.nombre}`}
        />
      ) : alternativa.tipo === "lista" ? (
        <Image
          ref={imagen}
          source={{ uri: alternativa.url }}
          style={{ width: "100%", height: alto }}
          contentFit="contain"
          autoplay={reproduciendo}
          cachePolicy="none"
          accessibilityLabel={`Demostración ExerciseDB de ${ejercicio.nombre}`}
          onLoad={() => {
            if (Platform.OS !== "web" && !reproduciendo)
              void imagen.current?.stopAnimating();
          }}
          onError={() =>
            setAlternativa({
              tipo: "error",
              mensaje:
                "La animación no está disponible. Puedes volver a WorkoutX.",
            })
          }
        />
      ) : (
        <View
          style={{ minHeight: alto }}
          className="items-center justify-center p-5"
          accessibilityLiveRegion="polite"
        >
          {alternativa.tipo === "cargando" && (
            <ActivityIndicator color={palette.primary} />
          )}
          <Text className="mt-3 text-center text-sm leading-6 text-text-secondary">
            {alternativa.tipo === "cargando"
              ? "Buscando demostración alternativa..."
              : alternativa.tipo === "error"
                ? alternativa.mensaje
                : "Sin demostración alternativa con una correspondencia exacta. Puedes seguir usando WorkoutX."}
          </Text>
          {alternativa.tipo === "error" && (
            <TouchableOpacity
              onPress={() => void consultar()}
              accessibilityRole="button"
              className="mt-3 min-h-12 justify-center rounded-xl bg-primary px-4"
            >
              <Text className="font-semibold text-background">Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {fuente === "exercisedb" && (
        <Text className="px-4 pb-3 text-center text-sm leading-5 text-text-secondary">
          ExerciseDB V1 · AscendAPI · Uso académico no comercial
        </Text>
      )}
    </View>
  );
}
