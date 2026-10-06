import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MaquinasController";
import type { DificultadEjercicio, Maquina } from "@/models/entities/Maquina";

type Fase = "inicio" | "escaneando" | "analizando" | "eligiendo" | "detectada";

const FONDO = ["#0f1d18", "#132a22"] as const;
const LADO_MARCO = 220;

const ETIQUETA_DIFICULTAD: Record<DificultadEjercicio, string> = {
  Principiante: "bg-background/25",
  Intermedio: "bg-background/25",
  Avanzado: "bg-accent-strong/80",
};

/** Marco con esquinas resaltadas que encuadra la máquina. */
function MarcoEscaneo({ detectada }: { detectada: boolean }) {
  const color = detectada ? palette.primary : palette.primaryLight;
  const esquina = {
    position: "absolute" as const,
    width: 28,
    height: 28,
    borderColor: color,
  };
  return (
    <View style={{ width: LADO_MARCO, height: LADO_MARCO }}>
      <View
        style={{
          ...StyleSheet.absoluteFill,
          borderWidth: 1,
          borderColor: `${color}66`,
          borderRadius: 18,
        }}
      />
      <View
        style={{
          ...esquina,
          top: 0,
          left: 0,
          borderTopWidth: 3,
          borderLeftWidth: 3,
          borderTopLeftRadius: 18,
        }}
      />
      <View
        style={{
          ...esquina,
          top: 0,
          right: 0,
          borderTopWidth: 3,
          borderRightWidth: 3,
          borderTopRightRadius: 18,
        }}
      />
      <View
        style={{
          ...esquina,
          bottom: 0,
          left: 0,
          borderBottomWidth: 3,
          borderLeftWidth: 3,
          borderBottomLeftRadius: 18,
        }}
      />
      <View
        style={{
          ...esquina,
          bottom: 0,
          right: 0,
          borderBottomWidth: 3,
          borderRightWidth: 3,
          borderBottomRightRadius: 18,
        }}
      />
      <View className="flex-1 items-center justify-center">
        <Ionicons
          name={detectada ? "checkmark-circle" : "scan-outline"}
          size={36}
          color={color}
        />
      </View>
    </View>
  );
}

/**
 * Escáner de máquinas (interfaz de "realidad aumentada").
 *
 * Flujo: inicio → cámara → captura → reconocimiento → ficha superpuesta en
 * la cámara. Mientras no exista el modelo de IA
 * (`services/ai/reconocimientoMaquinas.ts`), el reconocimiento devuelve
 * `null` y el usuario CONFIRMA la máquina en una lista. Desde la ficha de una
 * máquina (`?maquinaId=`), se muestra esa máquina directamente sobre la cámara.
 */
export default function EscanerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { maquinaId } = useLocalSearchParams<{ maquinaId?: string }>();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);

  const [fase, setFase] = useState<Fase>("inicio");
  const [maquina, setMaquina] = useState<Maquina | null>(null);
  const [catalogo, setCatalogo] = useState<Maquina[]>([]);
  const [busqueda, setBusqueda] = useState("");

  // Máquina preseleccionada desde su ficha ("Ver en Realidad Aumentada").
  useEffect(() => {
    if (!maquinaId) return;
    let activo = true;
    MaquinasController.obtenerPorId(maquinaId)
      .then((m) => activo && setMaquina(m))
      .catch((error) => console.warn("No se pudo cargar la máquina:", error));
    return () => {
      activo = false;
    };
  }, [maquinaId]);

  const opciones = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return texto
      ? catalogo.filter((m) => m.nombre.toLowerCase().includes(texto))
      : catalogo;
  }, [catalogo, busqueda]);

  const volver = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/(app)/machines" as Href);

  const iniciar = async () => {
    const respuesta = permiso?.granted ? permiso : await pedirPermiso();
    if (!respuesta.granted) return;
    setFase(maquinaId && maquina ? "detectada" : "escaneando");
  };

  const capturar = async () => {
    setFase("analizando");
    let reconocida = null;
    try {
      const foto = await camara.current?.takePictureAsync({ quality: 0.5 });
      reconocida = foto
        ? await MaquinasController.reconocerDesdeFoto(foto.uri)
        : null;
      if (reconocida) {
        setMaquina(reconocida);
        setFase("detectada");
        return;
      }
    } catch (error) {
      console.warn("No se pudo analizar la foto:", error);
    }
    try {
      // Sin modelo (o con baja confianza): el usuario confirma la máquina.
      setCatalogo(await MaquinasController.listar());
      setFase("eligiendo");
    } catch (error) {
      console.error("No se pudo cargar el catálogo de máquinas:", error);
      setFase("escaneando");
      Alert.alert(
        "No se pudo cargar el catálogo",
        "Verifica tu conexión e inténtalo nuevamente.",
      );
    }
  };

  const camaraActiva = fase !== "inicio" && permiso?.granted;
  const permisoDenegado = permiso && !permiso.granted && !permiso.canAskAgain;

  return (
    <View className="flex-1" style={{ backgroundColor: FONDO[0] }}>
      {camaraActiva ? (
        <CameraView
          ref={camara}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      ) : (
        <LinearGradient colors={FONDO} style={StyleSheet.absoluteFill} />
      )}
      {camaraActiva && <View className="absolute inset-0 bg-black/30" />}

      {/* Barra superior */}
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={volver}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/15"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={18} color="#ffffff" />
        </TouchableOpacity>
        <View className="rounded-full bg-white/15 px-4 py-1.5">
          <Text className="text-xs font-bold text-white">Escáner AR</Text>
        </View>
        <View className="h-9 w-9" />
      </View>

      {/* Contenido central */}
      <View className="flex-1 items-center justify-center px-8">
        {fase === "inicio" && (
          <>
            <LinearGradient
              colors={[palette.accentStrong, palette.accent]}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera-outline" size={36} color="#ffffff" />
            </LinearGradient>
            <Text className="mt-6 text-xl font-bold text-white">
              {maquina ? maquina.nombre : "Escanea una Máquina"}
            </Text>
            <Text className="mt-2 text-center text-[13px] leading-5 text-white/70">
              {maquina
                ? "Apunta tu cámara a la máquina para ver sus ejercicios en realidad aumentada"
                : "Apunta tu cámara a cualquier máquina del gimnasio para ver ejercicios en realidad aumentada"}
            </Text>
            {permisoDenegado ? (
              <TouchableOpacity
                className="mt-8 rounded-2xl bg-white/15 px-6 py-3"
                onPress={() => Linking.openSettings()}
              >
                <Text className="text-sm font-bold text-white">
                  Activar la cámara en Ajustes
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={iniciar}
                className="mt-8 overflow-hidden rounded-2xl"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[palette.accentStrong, palette.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 28,
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons name="scan" size={18} color="#ffffff" />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Iniciar Escaneo
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {(fase === "escaneando" || fase === "analizando") && (
          <>
            <MarcoEscaneo detectada={false} />
            <Text className="mt-6 text-sm font-bold text-white">
              {fase === "analizando"
                ? "Analizando..."
                : "Escaneando máquina..."}
            </Text>
          </>
        )}

        {fase === "detectada" && <MarcoEscaneo detectada />}
      </View>

      {/* Parte inferior según la fase */}
      <View className="px-4" style={{ paddingBottom: insets.bottom + 12 }}>
        {fase === "escaneando" && (
          <>
            <TouchableOpacity
              onPress={capturar}
              className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full border-4 border-white bg-white/20"
              accessibilityLabel="Capturar"
            />
            <View className="rounded-2xl bg-white/10 px-4 py-3">
              <Text className="text-center text-xs text-white/80">
                Mantén la cámara enfocada en la máquina y toca el botón
              </Text>
            </View>
          </>
        )}

        {fase === "analizando" && (
          <ActivityIndicator color="#ffffff" style={{ marginBottom: 24 }} />
        )}

        {fase === "eligiendo" && (
          <View className="max-h-[420px] rounded-3xl bg-background p-4">
            <Text className="text-base font-bold text-foreground">
              ¿Qué máquina es?
            </Text>
            <Text className="mb-3 mt-1 text-xs text-text-muted">
              El reconocimiento automático está en desarrollo. Elige la máquina
              para continuar.
            </Text>
            <TextInput
              className="mb-2 rounded-xl border border-primary-light px-3 py-2 text-sm text-foreground"
              placeholder="Buscar máquina..."
              placeholderTextColor="#9ca3af"
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <FlatList
              data={opciones}
              keyExtractor={(m) => m.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center justify-between border-b border-primary-light/40 py-2.5"
                  onPress={() => {
                    setMaquina(item);
                    setFase("detectada");
                  }}
                >
                  <Text className="flex-1 text-sm text-foreground">
                    {item.nombre}
                  </Text>
                  <Text className="ml-2 text-[11px] text-primary">
                    {item.categoria}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              className="mt-3 self-center"
              onPress={() => setFase("escaneando")}
            >
              <Text className="text-xs font-bold text-primary">
                Volver a intentar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {fase === "detectada" && maquina && (
          <LinearGradient
            colors={[palette.primary, palette.primaryDark]}
            style={{ borderRadius: 24, padding: 16 }}
          >
            <View className="mb-3 flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Ionicons name="locate-outline" size={18} color="#ffffff" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[11px] text-white/80">
                  Máquina Detectada
                </Text>
                <Text
                  className="text-lg font-bold text-white"
                  numberOfLines={1}
                >
                  {maquina.nombre}
                </Text>
              </View>
            </View>

            {maquina.ejerciciosGif.slice(0, 4).map((e) => (
              <View
                key={e.workoutxId}
                className="mb-2 flex-row items-center justify-between rounded-xl bg-white/15 px-3 py-2.5"
              >
                <Text
                  className="flex-1 text-[13px] font-semibold text-white"
                  numberOfLines={1}
                >
                  {e.nombre}
                </Text>
                <View
                  className={`ml-2 rounded-full px-2 py-0.5 ${ETIQUETA_DIFICULTAD[e.dificultad]}`}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {e.dificultad}
                  </Text>
                </View>
              </View>
            ))}

            <View className="mt-2 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-white py-3"
                onPress={() =>
                  router.replace(`/(app)/machines/${maquina.id}` as Href)
                }
              >
                <Text className="text-sm font-bold text-primary">
                  Ver Detalles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-white/20 py-3"
                onPress={() => {
                  setMaquina(null);
                  setBusqueda("");
                  setFase("escaneando");
                }}
              >
                <Text className="text-sm font-bold text-white">
                  Escanear Otra
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}
      </View>
    </View>
  );
}
