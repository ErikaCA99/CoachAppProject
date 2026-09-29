import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MaquinasController";
import type { Maquina } from "@/models/entities/Maquina";

const { width: ANCHO_PANTALLA } = Dimensions.get("window");

const CONSEJOS_SEGURIDAD = [
  "Calienta 5-10 minutos antes de iniciar con cargas altas.",
  "Mantén la espalda neutra y el core activo durante todo el movimiento.",
  "Controla el rango de movimiento: evita bloquear las articulaciones de golpe.",
  "Empieza con poco peso hasta dominar la técnica correcta.",
  "Si es tu primera vez con esta máquina, pide apoyo de un entrenador.",
];

export default function MachineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [maquina, setMaquina] = useState<Maquina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagenActiva, setImagenActiva] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);
      const idNumerico = Number(id);

      if (!Number.isFinite(idNumerico)) {
        setError("Máquina no válida.");
        setCargando(false);
        return;
      }

      const resultado = await MaquinasController.obtenerPorId(idNumerico);
      if (!activo) return;

      if (!resultado) {
        setError("No se pudo cargar la información de esta máquina.");
      } else {
        setMaquina(resultado);
      }
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

  const abrirVideo = () => {
    if (!maquina?.videoUrl) {
      Alert.alert(
        "Sin video",
        "No hay un video disponible para este ejercicio.",
      );
      return;
    }
    Linking.openURL(maquina.videoUrl).catch(() =>
      Alert.alert("Error", "No se pudo abrir el video."),
    );
  };

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
        <Text className="mt-3 text-sm text-text-muted">Cargando...</Text>
      </View>
    );
  }

  if (error || !maquina) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Ionicons name="alert-circle-outline" size={40} color={palette.error} />
        <Text className="mt-3 text-center text-sm text-error">
          {error ?? "Máquina no encontrada."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
    >
      {maquina.imagenes.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(evento) => {
              const indice = Math.round(
                evento.nativeEvent.contentOffset.x / ANCHO_PANTALLA,
              );
              setImagenActiva(indice);
            }}
          >
            {maquina.imagenes.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: ANCHO_PANTALLA, height: 240 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {maquina.imagenes.length > 1 && (
            <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
              {maquina.imagenes.map((uri, indice) => (
                <View
                  key={uri}
                  className={`h-1.5 w-1.5 rounded-full ${
                    indice === imagenActiva
                      ? "bg-background"
                      : "bg-background/40"
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View
          className="items-center justify-center bg-primary-light/30"
          style={{ width: ANCHO_PANTALLA, height: 200 }}
        >
          <Ionicons name="barbell-outline" size={48} color={palette.primary} />
        </View>
      )}

      <View className="p-5">
        <Text className="mb-1 text-2xl font-bold text-foreground">
          {maquina.nombre}
        </Text>
        <Text className="mb-4 text-sm font-semibold text-primary">
          {maquina.categoria}
        </Text>

        {maquina.gruposMusculares.length > 0 && (
          <View className="mb-4">
            <Text className="mb-2 text-sm font-bold text-foreground">
              Músculos principales
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {maquina.gruposMusculares.map((musculo) => (
                <View
                  key={musculo}
                  className="rounded-full bg-primary-light/40 px-3 py-1"
                >
                  <Text className="text-xs font-semibold text-primary">
                    {musculo}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {maquina.gruposMuscularesSecundarios.length > 0 && (
          <View className="mb-4">
            <Text className="mb-2 text-sm font-bold text-foreground">
              Músculos secundarios
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {maquina.gruposMuscularesSecundarios.map((musculo) => (
                <View
                  key={musculo}
                  className="rounded-full border border-border px-3 py-1"
                >
                  <Text className="text-xs font-semibold text-text-secondary">
                    {musculo}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {maquina.equipo.length > 0 && (
          <View className="mb-5">
            <Text className="mb-2 text-sm font-bold text-foreground">
              Equipo necesario
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {maquina.equipo.map((equipo) => (
                <View
                  key={equipo}
                  className="flex-row items-center rounded-full bg-accent/15 px-3 py-1"
                >
                  <Ionicons
                    name="barbell"
                    size={12}
                    color={palette.accentStrong}
                  />
                  <Text className="ml-1 text-xs font-semibold text-accent-strong">
                    {equipo}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text className="mb-2 text-base font-bold text-foreground">
          Descripción
        </Text>
        <Text className="mb-5 text-sm leading-5 text-text-secondary">
          {maquina.descripcion}
        </Text>

        {maquina.instrucciones.length > 0 && (
          <View className="mb-5">
            <Text className="mb-2 text-base font-bold text-foreground">
              Instrucciones
            </Text>
            {maquina.instrucciones.map((paso, indice) => (
              <View key={indice} className="mb-2 flex-row">
                <Text className="mr-2 text-sm font-bold text-primary">
                  {indice + 1}.
                </Text>
                <Text className="flex-1 text-sm leading-5 text-text-secondary">
                  {paso}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="mb-5 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <View className="mb-2 flex-row items-center">
            <Ionicons
              name="warning-outline"
              size={18}
              color={palette.accentStrong}
            />
            <Text className="ml-2 text-sm font-bold text-accent-strong">
              Consejos de seguridad
            </Text>
          </View>
          {CONSEJOS_SEGURIDAD.map((consejo) => (
            <Text
              key={consejo}
              className="mb-1 text-xs leading-5 text-text-secondary"
            >
              • {consejo}
            </Text>
          ))}
        </View>

        {maquina.videoUrl && (
          <TouchableOpacity
            className="mb-8 flex-row items-center justify-center rounded-2xl bg-primary p-4"
            onPress={abrirVideo}
          >
            <Ionicons name="play-circle" size={20} color={palette.background} />
            <Text className="ml-2 text-sm font-bold text-background">
              Ver video demostrativo
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
