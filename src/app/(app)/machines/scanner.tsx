import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import {
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HojaConfirmacionMaquina } from "@/components/machines/scanner/MachineConfirmationSheet";
import {
  HojaSugerenciasMaquina,
  type SugerenciaMaquina,
} from "@/components/machines/scanner/SuggestionsSheet";
import { IndicadorDeteccionAR } from "@/components/machines/scanner/ARDetectionIndicator";
import {
  AR_NATIVA_DISPONIBLE,
  CamaraAR,
} from "@/components/machines/scanner/MachineARView";
import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { conOpacidad, palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MachinesController";
import type { DificultadEjercicio, Maquina } from "@/models/entities/Machine";
import type { ResultadoEscaneo } from "@/controllers/MachinesController";
import type { CamaraARRef, EstadoAR } from "@/services/ar/machineAR.types";
import { toast } from "@/utils/toast";

type Fase = "inicio" | "escaneando" | "analizando" | "eligiendo" | "detectada";

const FONDO = [palette.cameraDark, palette.cameraDarkEnd] as const;
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
          borderColor: conOpacidad(color, 0.4),
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
 * Escáner: reconocimiento local/nube y anclaje espacial ARCore en Android.
 *
 * Flujo: cámara → captura → reconocimiento → ficha superpuesta en la cámara.
 * Si el permiso ya está concedido, la cámara se abre al entrar; la pantalla
 * explicativa solo aparece cuando falta el permiso. Si el modelo duda, el
 * usuario elige entre las candidatas o CONFIRMA la máquina en una lista.
 * Desde la ficha de una máquina (`?maquinaId=`), se muestra esa máquina
 * directamente sobre la cámara.
 */
export default function EscanerScreen() {
  const router = useRouter();
  const enfocada = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: altoPantalla } = useWindowDimensions();
  const { maquinaId } = useLocalSearchParams<{ maquinaId?: string }>();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const camaraAR = useRef<CamaraARRef>(null);
  const solicitud = useRef(0);
  const capturando = useRef(false);
  const [usarAR, setUsarAR] = useState(AR_NATIVA_DISPONIBLE);
  const [estadoAR, setEstadoAR] = useState<EstadoAR>({
    estado: "buscando",
    mensaje: "Mueve lentamente el teléfono para detectar superficies.",
  });
  const [capturaId, setCapturaId] = useState<string | null>(null);
  const [deteccion, setDeteccion] = useState<ResultadoEscaneo | null>(null);
  const modoAR = usarAR && !!CamaraAR;

  /** Fase elegida por el usuario; "inicio" delega en {@link fase} (derivada). */
  const [faseManual, setFase] = useState<Fase>("inicio");
  /** La precarga de `?maquinaId=` falló: se escanea como si no hubiera máquina. */
  const [precargaFallida, setPrecargaFallida] = useState(false);
  /** En "eligiendo" es la candidata; en "detectada", la confirmada. */
  const [maquina, setMaquina] = useState<Maquina | null>(null);
  const [catalogo, setCatalogo] = useState<Maquina[]>([]);
  /** Predicción del reconocimiento (aunque tenga baja confianza). */
  const [sugerencia, setSugerencia] = useState<{
    maquinaId: string;
    confianza: number;
  } | null>(null);
  /** Las tres candidatas del modelo cuando no está seguro (vacío si no hay modelo). */
  const [sugerencias, setSugerencias] = useState<SugerenciaMaquina[]>([]);
  /** El usuario descartó las candidatas y busca en el catálogo completo. */
  const [verCatalogo, setVerCatalogo] = useState(false);

  useEffect(() => {
    return () => {
      solicitud.current += 1;
      capturando.current = false;
      setFase("escaneando");
      setMaquina(null);
      setDeteccion(null);
      setCapturaId(null);
      setSugerencia(null);
      setSugerencias([]);
      setVerCatalogo(false);
    };
  }, [enfocada]);

  // Máquina preseleccionada desde su ficha ("Ver en Realidad Aumentada").
  useEffect(() => {
    if (!maquinaId) return;
    let activo = true;
    MaquinasController.obtenerPorId(maquinaId)
      .then((m) => {
        if (!activo) return;
        if (m) setMaquina(m);
        else setPrecargaFallida(true);
      })
      .catch((error) => {
        console.warn("No se pudo cargar la máquina:", error);
        if (activo) setPrecargaFallida(true);
      });
    return () => {
      activo = false;
    };
  }, [maquinaId]);

  const volver = () =>
    router.canGoBack() ? router.back() : router.replace("/(app)/machines");

  /**
   * Con el permiso concedido la cámara se abre sola: la fase "inicio" solo
   * se queda cuando falta el permiso o mientras carga la máquina de `?maquinaId=`.
   */
  const fase: Fase =
    faseManual !== "inicio" || !permiso?.granted
      ? faseManual
      : maquinaId && !precargaFallida
        ? maquina
          ? "detectada"
          : "inicio"
        : "escaneando";

  const reiniciarEscaneo = () => {
    solicitud.current += 1;
    capturando.current = false;
    setCapturaId(null);
    setDeteccion(null);
    setMaquina(null);
    setSugerencia(null);
    setSugerencias([]);
    setVerCatalogo(false);
    setFase("escaneando");
  };

  const capturar = async () => {
    if (capturando.current) return;
    capturando.current = true;
    const numeroSolicitud = ++solicitud.current;
    setFase("analizando");
    let resultado = null;
    try {
      const foto = modoAR
        ? await camaraAR.current?.capturar()
        : await camara.current?.takePictureAsync({ quality: 0.5 });
      if (numeroSolicitud !== solicitud.current) return;
      setCapturaId(foto && "capturaId" in foto ? foto.capturaId : null);
      resultado = foto
        ? await MaquinasController.reconocerDesdeFoto(foto.uri)
        : null;
    } catch (error) {
      console.warn("No se pudo analizar la foto:", error);
      if (numeroSolicitud !== solicitud.current) return;
      capturando.current = false;
      setFase("escaneando");
      toast.error(
        "No se pudo analizar la foto. Comprueba la cámara y vuelve a intentarlo.",
      );
      return;
    }
    if (numeroSolicitud !== solicitud.current) return;
    capturando.current = false;
    setDeteccion(resultado);

    setSugerencia(
      resultado
        ? { maquinaId: resultado.maquina.id, confianza: resultado.confianza }
        : null,
    );
    setVerCatalogo(false);
    if (resultado && !resultado.requiereConfirmacion) {
      setSugerencias([]);
      setMaquina(resultado.maquina);
      setFase("detectada");
      return;
    }
    // Con baja confianza no se preselecciona nada: se ofrecen las candidatas.
    setMaquina(null);
    if (!resultado)
      toast.info("No reconocí ninguna máquina. Elígela de la lista.");
    setSugerencias(
      resultado
        ? [
            { maquina: resultado.maquina, confianza: resultado.confianza },
            ...resultado.alternativas,
          ]
        : [],
    );

    try {
      // Sin modelo o con baja confianza: el usuario confirma la máquina.
      setCatalogo(await MaquinasController.listar());
      if (numeroSolicitud !== solicitud.current) return;
      setFase("eligiendo");
    } catch (error) {
      if (numeroSolicitud !== solicitud.current) return;
      console.error("No se pudo cargar el catálogo de máquinas:", error);
      setFase("escaneando");
      toast.error(
        "No se pudo cargar el catálogo. Verifica tu conexión e inténtalo nuevamente.",
      );
    }
  };

  const esSugerida = !!maquina && sugerencia?.maquinaId === maquina.id;
  const porcentaje = sugerencia ? Math.round(sugerencia.confianza * 100) : 0;
  const etiquetaIndicador =
    fase === "detectada"
      ? esSugerida
        ? `Detectada · ${porcentaje} %`
        : "Máquina confirmada"
      : esSugerida
        ? `Sugerencia · ${porcentaje} %`
        : "Tu selección";
  const mostrarIndicador =
    !!maquina && (fase === "eligiendo" || fase === "detectada");

  const camaraActiva = fase !== "inicio" && permiso?.granted;
  const permisoDenegado = permiso && !permiso.granted && !permiso.canAskAgain;
  /** Aún no se sabe el estado del permiso, o falta cargar la máquina precargada. */
  const preparando = fase === "inicio" && (!permiso || permiso.granted);
  const objetivoAR =
    fase === "detectada"
      ? MaquinasController.prepararObjetivoAR(maquina, deteccion, capturaId)
      : null;

  return (
    <View className="flex-1" style={{ backgroundColor: FONDO[0] }}>
      {camaraActiva && modoAR && CamaraAR ? (
        <CamaraAR
          ref={camaraAR}
          style={StyleSheet.absoluteFill}
          activa={enfocada}
          objetivo={objetivoAR}
          onEstado={(evento) => setEstadoAR(evento.nativeEvent)}
        />
      ) : camaraActiva && enfocada ? (
        <CameraView
          ref={camara}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      ) : (
        <LinearGradient colors={FONDO} style={StyleSheet.absoluteFill} />
      )}
      {camaraActiva && (
        <View pointerEvents="none" className="absolute inset-0 bg-black/15" />
      )}

      {/* Barra superior */}
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={volver}
          className="h-11 w-11 items-center justify-center rounded-full bg-background/15"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color={palette.background} />
        </TouchableOpacity>
        <View className="rounded-full bg-background/15 px-4 py-2">
          <Text
            className="text-sm font-bold text-background"
            accessibilityRole="header"
          >
            Identificar máquina
          </Text>
        </View>
        <View className="h-11 w-11" />
      </View>

      {/* Identificación visual: miniatura de la máquina + ícono 3D */}
      {mostrarIndicador && maquina ? (
        <View className="mt-3 px-4">
          <IndicadorDeteccionAR
            maquina={maquina}
            etiqueta={etiquetaIndicador}
            confirmada={fase === "detectada"}
          />
        </View>
      ) : null}

      {/* Contenido central */}
      <View
        pointerEvents="box-none"
        className="flex-1 items-center justify-center px-8"
      >
        {preparando && (
          <IndicadorCarga size="large" color={palette.background} />
        )}

        {fase === "inicio" && !preparando && (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-accent-strong">
              <Ionicons
                name="camera-outline"
                size={36}
                color={palette.background}
              />
            </View>
            <Text
              accessibilityRole="header"
              className="mt-6 text-center text-xl font-bold text-background"
            >
              Necesitamos la cámara
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-background/80">
              Para identificar la máquina con una foto. Si prefieres no darla,
              puedes buscarla en el catálogo.
            </Text>
            <View className="mt-8 self-stretch">
              <BotonPrimario
                titulo={permisoDenegado ? "Abrir ajustes" : "Permitir cámara"}
                onPress={() => {
                  if (permisoDenegado) void Linking.openSettings();
                  else void pedirPermiso();
                }}
              />
            </View>
            <TouchableOpacity
              onPress={volver}
              className="mt-2 min-h-11 items-center justify-center px-4"
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-background">
                Buscar en el catálogo
              </Text>
            </TouchableOpacity>
          </>
        )}

        {(fase === "escaneando" || fase === "analizando") && (
          <>
            <View pointerEvents="none">
              <MarcoEscaneo detectada={false} />
            </View>
            {fase === "analizando" && (
              <Text
                className="mt-6 text-sm font-bold text-background"
                accessibilityLiveRegion="polite"
              >
                Analizando la foto...
              </Text>
            )}
          </>
        )}

        {fase === "detectada" && !modoAR && <MarcoEscaneo detectada />}
      </View>

      {/* Parte inferior según la fase */}
      <View className="px-4" style={{ paddingBottom: insets.bottom + 12 }}>
        {camaraActiva && modoAR && (
          <View className="mb-3 rounded-2xl bg-black/75 px-4 py-3">
            <Text
              accessibilityLiveRegion="polite"
              className="text-sm text-background"
            >
              {estadoAR.mensaje}
            </Text>
            {estadoAR.estado === "anclada" && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void camaraAR.current?.recolocar()}
                className="min-h-12 justify-center"
              >
                <Text className="font-bold text-background">
                  Recolocar información
                </Text>
              </TouchableOpacity>
            )}
            {(estadoAR.estado === "error" ||
              estadoAR.estado === "noCompatible" ||
              estadoAR.estado === "instalando") && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setUsarAR(false);
                  reiniciarEscaneo();
                }}
                className="min-h-12 justify-center"
              >
                <Text className="font-bold text-background">
                  Usar cámara sin AR
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {fase === "escaneando" && (
          <>
            <TouchableOpacity
              onPress={capturar}
              disabled={
                modoAR &&
                !["lista", "anclada", "colocar"].includes(estadoAR.estado)
              }
              accessibilityState={{
                disabled:
                  modoAR &&
                  !["lista", "anclada", "colocar"].includes(estadoAR.estado),
              }}
              className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full border-4 border-background bg-background/20"
              accessibilityRole="button"
              accessibilityLabel="Identificar máquina"
            />
            <View className="rounded-2xl bg-background/10 px-4 py-3">
              <Text className="text-center text-sm text-background/80">
                Encuadra la máquina y toca el botón para identificarla
              </Text>
            </View>
          </>
        )}

        {fase === "analizando" && (
          <IndicadorCarga
            color={palette.background}
            style={{ marginBottom: 24 }}
          />
        )}

        {fase === "eligiendo" && sugerencias.length > 0 && !verCatalogo && (
          <HojaSugerenciasMaquina
            sugerencias={sugerencias}
            onElegir={(elegida) => {
              setMaquina(elegida);
              setFase("detectada");
            }}
            onNinguna={() => setVerCatalogo(true)}
            onReintentar={reiniciarEscaneo}
          />
        )}

        {fase === "eligiendo" && (sugerencias.length === 0 || verCatalogo) && (
          <HojaConfirmacionMaquina
            catalogo={catalogo}
            seleccionada={maquina}
            onSeleccionar={setMaquina}
            sugerencia={sugerencia}
            onConfirmar={() => maquina && setFase("detectada")}
            onReintentar={reiniciarEscaneo}
            alturaMaxima={altoPantalla * 0.66}
          />
        )}

        {fase === "detectada" && maquina && (
          <LinearGradient
            colors={[palette.primary, palette.primaryDark]}
            style={{ borderRadius: 24, padding: 16 }}
          >
            <View className="mb-3 flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-background/20">
                <Ionicons
                  name="locate-outline"
                  size={18}
                  color={palette.background}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm text-background/80">
                  {esSugerida ? "Máquina detectada" : "Máquina confirmada"}
                </Text>
                <Text
                  className="text-lg font-bold text-background"
                  numberOfLines={1}
                >
                  {maquina.nombre}
                </Text>
              </View>
            </View>

            {maquina.ejerciciosGif.slice(0, 4).map((e) => (
              <View
                key={e.workoutxId}
                className="mb-2 flex-row items-center justify-between rounded-xl bg-background/15 px-3 py-2.5"
              >
                <Text
                  className="flex-1 text-sm font-semibold text-background"
                  numberOfLines={1}
                >
                  {e.nombre}
                </Text>
                <View
                  className={`ml-2 rounded-full px-2 py-0.5 ${ETIQUETA_DIFICULTAD[e.dificultad]}`}
                >
                  <Text className="text-sm font-bold text-background">
                    {e.dificultad}
                  </Text>
                </View>
              </View>
            ))}

            <View className="mt-2 flex-row gap-3">
              <TouchableOpacity
                accessibilityRole="button"
                className="min-h-11 flex-1 items-center justify-center rounded-2xl bg-background py-3"
                onPress={() =>
                  router.replace({
                    pathname: "/(app)/machines/[id]",
                    params: { id: maquina.id },
                  })
                }
              >
                <Text className="text-sm font-bold text-primary">
                  Ver detalles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                className="min-h-11 flex-1 items-center justify-center rounded-2xl bg-background/20 py-3"
                onPress={reiniciarEscaneo}
              >
                <Text className="text-sm font-bold text-background">
                  Escanear otra
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}
      </View>
    </View>
  );
}
