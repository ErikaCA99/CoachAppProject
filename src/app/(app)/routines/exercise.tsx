import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ImagenStorage } from "@/components/machines/StorageImage";
import { SeccionFicha } from "@/components/machines/SheetSection";
import { AppHeader } from "@/components/ui/AppHeader";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { useFichaEjercicio } from "@/hooks/useExerciseSheet";

const ALTO_DEMOSTRACION = 240;

function leerId(param: string | string[] | undefined): number | null {
  const valor = Number(Array.isArray(param) ? param[0] : param);
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}

/**
 * Ficha de un ejercicio de rutina que no usa ninguna máquina del catálogo
 * (peso libre, peso corporal, cardio): imagen o GIF, músculos, equipo, pasos
 * y descripción. Las máquinas tienen su propia ficha (`machines/[id]`).
 */
export default function FichaEjercicioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, nombre } = useLocalSearchParams<{
    id?: string;
    nombre?: string;
  }>();
  const wgerId = leerId(id);

  if (wgerId === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-5">
        <Text className="text-center text-base text-text-secondary">
          No se pudo abrir este ejercicio.
        </Text>
      </View>
    );
  }
  return (
    <Ficha
      wgerId={wgerId}
      nombreRuta={Array.isArray(nombre) ? nombre[0] : nombre}
      insetTop={insets.top}
      onVolver={() => router.back()}
    />
  );
}

function Ficha({
  wgerId,
  nombreRuta,
  insetTop,
  onVolver,
}: {
  wgerId: number;
  nombreRuta?: string;
  insetTop: number;
  onVolver: () => void;
}) {
  const { cargando, ejercicio, respaldo } = useFichaEjercicio(wgerId);

  const titulo = ejercicio?.nombre ?? nombreRuta ?? "Ejercicio";
  const pasos =
    respaldo && respaldo.pasos.length > 0
      ? respaldo.pasos
      : (ejercicio?.instrucciones ?? []);
  // Si los pasos salen de la descripción de wger, mostrarla otra vez sería repetir.
  const descripcion =
    respaldo && respaldo.pasos.length > 0 && ejercicio
      ? ejercicio.descripcion
      : null;
  const hayDescripcionReal =
    descripcion && descripcion !== "Sin descripción disponible.";
  const usaGif = !ejercicio?.imagenUrl && respaldo?.gif != null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 20,
        paddingTop: insetTop + 24,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        title={titulo}
        subtitle={ejercicio?.categoria}
        onBackPress={onVolver}
      />

      <View
        className="mb-4 items-center justify-center overflow-hidden rounded-[20px] bg-primary-light/35"
        style={{ height: ALTO_DEMOSTRACION }}
      >
        {cargando ? (
          <ActivityIndicator color={palette.primary} />
        ) : ejercicio?.imagenUrl ? (
          <Image
            source={{ uri: ejercicio.imagenUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
            accessibilityLabel={`Demostración de ${titulo}`}
          />
        ) : respaldo?.gif ? (
          <ImagenStorage
            ruta={respaldo.gif}
            style={{ width: "100%", height: ALTO_DEMOSTRACION }}
            accessibilityLabel={`Demostración de ${titulo}`}
          />
        ) : respaldo && respaldo.imagenes.length > 0 ? (
          <View className="w-full flex-row">
            {respaldo.imagenes.map((ruta, indice) => (
              <View key={ruta} className="flex-1 items-center">
                <ImagenStorage
                  ruta={ruta}
                  style={{ width: "100%", height: ALTO_DEMOSTRACION - 28 }}
                  accessibilityLabel={`${indice === 0 ? "Inicio" : "Final"} de ${titulo}`}
                />
                <Text className="text-sm text-text-secondary">
                  {indice === 0 ? "Inicio" : "Final"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Ionicons name="barbell-outline" size={56} color={palette.primary} />
        )}
      </View>
      {usaGif && respaldo?.atribucionGymVisual ? (
        <Text className="-mt-2 mb-3 text-right text-sm text-text-muted">
          {respaldo.atribucionGymVisual}
        </Text>
      ) : null}

      {ejercicio &&
      (ejercicio.gruposMusculares.length > 0 || ejercicio.equipo.length > 0) ? (
        <View className="mb-4 flex-row flex-wrap gap-2">
          {ejercicio.gruposMusculares.map((m) => (
            <View
              key={`m-${m}`}
              className="rounded-full bg-primary px-3 py-1.5"
            >
              <Text className="text-sm font-semibold text-background">{m}</Text>
            </View>
          ))}
          {ejercicio.gruposMuscularesSecundarios.map((m) => (
            <View
              key={`s-${m}`}
              className="rounded-full bg-primary-light/40 px-3 py-1.5"
            >
              <Text className="text-sm font-semibold text-primary">{m}</Text>
            </View>
          ))}
          {ejercicio.equipo.map((e) => (
            <View
              key={`e-${e}`}
              className="rounded-full border border-border px-3 py-1.5"
            >
              <Text className="text-sm text-text-secondary">{e}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {pasos.length > 0 ? (
        <SeccionFicha titulo="Cómo hacerlo" icono="list-outline">
          {pasos.map((paso, indice) => (
            <View
              key={`${indice}-${paso.slice(0, 12)}`}
              className="mb-2 flex-row"
            >
              <Text className="mr-2 text-base font-bold text-primary">
                {indice + 1}.
              </Text>
              <Text className="flex-1 text-base leading-6 text-foreground">
                {paso}
              </Text>
            </View>
          ))}
        </SeccionFicha>
      ) : null}

      {hayDescripcionReal ? (
        <View className="mt-3">
          <SeccionFicha titulo="Descripción" icono="information-circle-outline">
            <Text className="text-base leading-6 text-foreground">
              {descripcion}
            </Text>
          </SeccionFicha>
        </View>
      ) : null}

      {!cargando && pasos.length === 0 && !hayDescripcionReal ? (
        <SeccionFicha titulo="Descripción" icono="information-circle-outline">
          <Text className="text-base leading-6 text-text-secondary">
            Este ejercicio aún no tiene descripción en el catálogo. Pide ayuda a
            un entrenador del gimnasio antes de hacerlo si no lo conoces.
          </Text>
        </SeccionFicha>
      ) : null}
    </ScrollView>
  );
}
