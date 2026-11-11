import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DemostracionEjercicio } from "@/features/machines/view/ExerciseDemonstration";
import { ImagenStorage } from "@/features/machines/view/StorageImage";
import { ModalAgregarRutina } from "@/features/machines/view/AddToRoutineModal";
import { GuiaMaquinaTabs } from "@/features/machines/view/MachineGuideTabs";
import { ImagenPoses } from "@/features/machines/view/PoseImage";
import { ClavesSeguridad } from "@/features/machines/view/SafetyKeys";
import { SeccionFicha } from "@/features/machines/view/SheetSection";
import { IndicadorCarga } from "@/shared/ui/LoadingIndicator";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorCarga } from "@/shared/ui/LoadError";
import { BotonPrimario } from "@/shared/ui/PrimaryButton";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import { MaquinasController } from "@/features/machines/controller/MachinesController";
import type { EjercicioWger } from "@/features/exercises";
import type {
  EjercicioGif,
  Maquina,
  DetalleEjercicioGenerado,
} from "@/features/machines";
import { useAuthStore } from "@/store/auth.store";

type VistaEjercicio = "pasos" | "poses" | "animacion";

const ALTO_PORTADA = 220;
/** Máximo de fotos de variantes en la galería, para no descargar decenas. */
const MAX_VARIANTES = 8;

export default function MachineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const uid = useAuthStore((s) => s.user?.uid);

  const [maquina, setMaquina] = useState<Maquina | null | undefined>();
  // Falló la carga (red, permisos): distinto de que la máquina no exista.
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [vistaEjercicio, setVistaEjercicio] = useState<VistaEjercicio>("pasos");
  const [reproduciendo, setReproduciendo] = useState(true);
  const [modalRutina, setModalRutina] = useState(false);
  const [modalEjercicio, setModalEjercicio] = useState(false);
  const [ejercicioGifSeleccionado, setEjercicioGifSeleccionado] =
    useState<EjercicioGif | null>(null);
  const [detalleEjercicio, setDetalleEjercicio] =
    useState<EjercicioWger | null>(null);
  const [detalleGenerado, setDetalleGenerado] =
    useState<DetalleEjercicioGenerado | null>(null);
  const [mensajeDetalleEjercicio, setMensajeDetalleEjercicio] = useState<
    string | null
  >(null);
  const [cargandoDetalleEjercicio, setCargandoDetalleEjercicio] =
    useState(false);

  useEffect(() => {
    let activo = true;
    MaquinasController.obtenerPorId(String(id))
      .then((m) => activo && setMaquina(m))
      .catch((error) => {
        console.error("Error al cargar la máquina:", error);
        if (activo) setErrorCarga(true);
      });
    return () => {
      activo = false;
    };
  }, [id, intento]);

  const reintentarCarga = () => {
    setErrorCarga(false);
    setMaquina(undefined);
    setIntento((n) => n + 1);
  };

  const volver = () =>
    router.canGoBack() ? router.back() : router.replace("/(app)/machines");

  if (errorCarga) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorCarga
          mensaje="No se pudo cargar la ficha. Revisa tu conexión e inténtalo de nuevo."
          onReintentar={reintentarCarga}
        />
      </View>
    );
  }

  if (maquina === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <IndicadorCarga size="large" color={palette.primary} />
      </View>
    );
  }

  if (maquina === null) {
    return (
      <View className="flex-1 justify-center bg-background">
        <EmptyState
          icon="search-outline"
          title="Esta máquina ya no está"
          description="Puede que se haya retirado del catálogo."
          actionButton={{
            label: "Volver al catálogo",
            icon: "arrow-back-outline",
            onPress: volver,
          }}
        />
      </View>
    );
  }

  const variantes = maquina.variantes
    .filter((v) => v.imagen && v.imagen !== maquina.imagenPrincipal)
    .slice(0, MAX_VARIANTES);

  const abrirDetalleEjercicio = async (ejercicioGif: EjercicioGif) => {
    setReproduciendo(true);
    setEjercicioGifSeleccionado(ejercicioGif);
    setDetalleEjercicio(null);
    setDetalleGenerado(null);
    setMensajeDetalleEjercicio(null);
    setVistaEjercicio("pasos");
    setModalEjercicio(true);
    setCargandoDetalleEjercicio(true);

    const resultado = await MaquinasController.obtenerDetalleEjercicio(
      maquina,
      ejercicioGif,
    );
    if (resultado.origen === "wger") setDetalleEjercicio(resultado.detalle);
    else setDetalleGenerado(resultado.detalle);
    setCargandoDetalleEjercicio(false);
  };

  const detalleGuia = detalleEjercicio ?? detalleGenerado;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Portada */}
        <View style={{ height: ALTO_PORTADA }} className="bg-background">
          <ImagenStorage
            ruta={maquina.imagenPrincipal}
            style={{ width: "100%", height: ALTO_PORTADA }}
            accessibilityLabel={maquina.nombre}
          />
          <LinearGradient
            colors={["transparent", palette.background]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 90,
            }}
          />
          <TouchableOpacity
            onPress={volver}
            className="absolute left-4 h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm"
            style={{ top: insets.top + 8 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color={palette.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4">
          <Text className="text-sm font-bold uppercase tracking-wider text-primary">
            {maquina.categoria}
          </Text>
          <Text
            accessibilityRole="header"
            className="text-2xl font-bold text-foreground"
          >
            {maquina.nombre}
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {maquina.musculosPrincipales.map((m) => (
              <View
                key={m}
                className="min-h-8 flex-row items-center rounded-full bg-primary-light/40 px-3"
              >
                <Text className="text-sm font-semibold text-foreground">
                  {m}
                </Text>
                <Ionicons
                  name="star"
                  size={11}
                  color={palette.primary}
                  style={{ marginLeft: 4 }}
                />
              </View>
            ))}
            {maquina.musculosSecundarios.map((m) => (
              <View
                key={m}
                className="min-h-8 justify-center rounded-full border border-primary-light px-3"
              >
                <Text className="text-sm text-text-secondary">{m}</Text>
              </View>
            ))}
          </View>
          <Text className="mt-2 text-sm text-text-secondary">
            ★ músculo principal
          </Text>

          <View className="mt-4">
            <GuiaMaquinaTabs
              maquina={maquina}
              onAbrirEjercicio={abrirDetalleEjercicio}
            />
          </View>

          <View className="mt-4">
            <SeccionFicha
              titulo="Descripción"
              icono="document-text-outline"
              plegable
            >
              <Text className="text-sm leading-6 text-text-secondary">
                {maquina.descripcion}
              </Text>
            </SeccionFicha>

            {variantes.length > 0 && (
              <SeccionFicha
                titulo="Variantes comerciales"
                plegable
                icono="images-outline"
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {variantes.map((v) => (
                    <View
                      key={v.handle}
                      className="mr-3 w-32 overflow-hidden rounded-xl border border-primary-light/60 bg-background"
                    >
                      <ImagenStorage
                        ruta={v.imagen}
                        style={{ width: "100%", aspectRatio: 1 }}
                      />
                      <Text
                        className="p-1.5 text-sm text-text-muted"
                        numberOfLines={2}
                      >
                        {v.nombre}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </SeccionFicha>
            )}
          </View>

          <Text className="mb-2 text-center text-sm leading-5 text-text-muted">
            Animaciones: WorkoutX · Ejercicios: wger y free-exercise-db · Fotos:
            Chelo Sports.{"\n"}
            Esta guía no reemplaza la supervisión de un entrenador.
          </Text>
        </View>
      </ScrollView>

      {/* La acción ocupa espacio propio: nunca cubre el contenido. */}
      <View
        className="border-t border-primary-light/60 bg-background px-4 pt-3"
        style={{ paddingBottom: 12 }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver la máquina con la cámara"
            activeOpacity={0.7}
            className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background"
            onPress={() =>
              router.push({
                pathname: "/(app)/machines/scanner",
                params: { maquinaId: maquina.id },
              })
            }
          >
            <Ionicons
              name="camera-outline"
              size={24}
              color={palette.foreground}
            />
          </TouchableOpacity>
          <View className="flex-1">
            <BotonPrimario
              titulo="Añadir a mi rutina"
              onPress={() => setModalRutina(true)}
            />
          </View>
        </View>
      </View>

      {uid && (
        <ModalAgregarRutina
          visible={modalRutina}
          maquina={maquina}
          usuarioId={uid}
          onCerrar={() => setModalRutina(false)}
        />
      )}

      <Modal
        visible={modalEjercicio}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalEjercicio(false)}
      >
        <View
          className="flex-1 bg-background"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          accessibilityViewIsModal
        >
          <View className="flex-row items-center border-b border-primary-light/60 px-5 py-3">
            <View className="flex-1 pr-3">
              <Text className="mb-1 text-sm font-semibold text-primary">
                GUÍA DEL EJERCICIO
              </Text>
              <Text
                accessibilityRole="header"
                className="text-xl font-bold text-foreground"
              >
                {ejercicioGifSeleccionado?.nombre}
              </Text>
              <Text className="mt-1 text-sm text-text-secondary">
                {maquina.nombre}
              </Text>
            </View>
            <TouchableOpacity
              className="h-12 w-12 items-center justify-center rounded-full bg-primary-light/20"
              onPress={() => setModalEjercicio(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle del ejercicio"
            >
              <Ionicons name="close" size={24} color={palette.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 32,
              width: "100%",
              maxWidth: 720,
              alignSelf: "center",
            }}
          >
            {modalEjercicio && ejercicioGifSeleccionado && (
              <>
                <View className="mb-4 flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-primary px-3 py-2">
                    <Text className="text-sm font-semibold text-background">
                      {ejercicioGifSeleccionado.dificultad}
                    </Text>
                  </View>
                  <View className="rounded-full bg-primary-light/25 px-3 py-2">
                    <Text className="text-sm font-semibold text-primary-dark">
                      {detalleGuia?.categoria || maquina.categoria}
                    </Text>
                  </View>
                </View>

                <View className="mb-5">
                  <SegmentedControl
                    options={[
                      { value: "pasos", label: "Pasos" },
                      { value: "poses", label: "Poses" },
                      { value: "animacion", label: "Animación" },
                    ]}
                    value={vistaEjercicio}
                    onChange={setVistaEjercicio}
                  />
                </View>

                {vistaEjercicio === "poses" &&
                  (ejercicioGifSeleccionado.imagenPoses ? (
                    <>
                      <View className="mb-5 rounded-3xl border border-primary-light/60 p-3">
                        <ImagenPoses
                          ruta={ejercicioGifSeleccionado.imagenPoses}
                          nombre={ejercicioGifSeleccionado.nombre}
                          mostrarLeyenda
                        />
                      </View>
                    </>
                  ) : (
                    <Text className="mb-5 text-sm leading-6 text-text-secondary">
                      Este ejercicio no tiene imagen de poses. Mira la animación
                      o los pasos.
                    </Text>
                  ))}

                {vistaEjercicio === "animacion" && (
                  <>
                    <View className="mb-5 overflow-hidden rounded-3xl border border-primary-light/60 bg-background">
                      <View className="flex-row items-center justify-between bg-primary-light/20 px-4 py-3">
                        <Text className="font-bold text-foreground">
                          {ejercicioGifSeleccionado.imagenPoses
                            ? "Animación del movimiento"
                            : "Observa la técnica"}
                        </Text>
                        <Ionicons
                          name="body-outline"
                          size={20}
                          color={palette.primary}
                          accessible={false}
                        />
                      </View>
                      <DemostracionEjercicio
                        key={ejercicioGifSeleccionado.workoutxId}
                        ejercicio={ejercicioGifSeleccionado}
                        alto={Math.min(width * 0.8, 340)}
                        reproduciendo={reproduciendo}
                      />
                      {Platform.OS !== "web" ? (
                        <TouchableOpacity
                          onPress={() => setReproduciendo((valor) => !valor)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            reproduciendo
                              ? "Pausar demostración"
                              : "Reproducir demostración"
                          }
                          className="min-h-12 flex-row items-center justify-center bg-primary px-4 py-3"
                        >
                          <Ionicons
                            name={
                              reproduciendo ? "pause-outline" : "play-outline"
                            }
                            size={20}
                            color={palette.background}
                            accessible={false}
                          />
                          <Text className="ml-2 text-sm font-semibold text-background">
                            {reproduciendo
                              ? "Pausar demostración"
                              : "Reproducir demostración"}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text className="px-4 py-3 text-center text-sm text-text-secondary">
                          Demostración del movimiento
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </>
            )}

            {vistaEjercicio === "pasos" && (
              <>
                {cargandoDetalleEjercicio ? (
                  <View
                    className="items-center py-6"
                    accessibilityLiveRegion="polite"
                  >
                    <IndicadorCarga decorativo color={palette.primary} />
                    <Text className="mt-2 text-sm text-text-secondary">
                      Cargando pasos del ejercicio...
                    </Text>
                  </View>
                ) : detalleGuia ? (
                  <>
                    <SeccionFicha
                      titulo="Ejecución paso a paso"
                      icono="list-outline"
                    >
                      {detalleGuia.instrucciones.length > 0 ? (
                        detalleGuia.instrucciones.map((paso, i) => (
                          <View
                            key={i}
                            className="mb-3 flex-row rounded-2xl bg-primary-light/15 p-3"
                          >
                            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-primary">
                              <Text className="text-sm font-bold text-background">
                                {i + 1}
                              </Text>
                            </View>
                            <Text className="flex-1 text-base leading-6 text-foreground">
                              {paso}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text className="text-sm leading-6 text-text-secondary">
                          No hay pasos disponibles para este ejercicio.
                        </Text>
                      )}
                    </SeccionFicha>
                    {!!detalleGuia.descripcion && (
                      <SeccionFicha
                        key={ejercicioGifSeleccionado?.workoutxId}
                        titulo="Más sobre este ejercicio"
                        icono="information-circle-outline"
                        plegable
                      >
                        <Text className="text-base leading-6 text-text-secondary">
                          {detalleGuia.descripcion}
                        </Text>
                      </SeccionFicha>
                    )}
                  </>
                ) : (
                  <Text className="mb-4 text-sm text-text-secondary">
                    {mensajeDetalleEjercicio ||
                      "El detalle del ejercicio no está disponible."}
                  </Text>
                )}

                {ejercicioGifSeleccionado && (
                  <>
                    <SeccionFicha
                      titulo="Músculos trabajados"
                      icono="body-outline"
                    >
                      <Text className="mb-2 text-sm font-semibold uppercase text-text-secondary">
                        Principal
                      </Text>
                      <Text className="text-base font-bold text-primary">
                        {ejercicioGifSeleccionado.musculoObjetivo.toLowerCase() ===
                        "glutes"
                          ? "Glúteos"
                          : ejercicioGifSeleccionado.musculoObjetivo}
                      </Text>
                      {!!detalleGuia?.gruposMusculares.length && (
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {detalleGuia.gruposMusculares.map(
                            (musculo, indice) => (
                              <View
                                key={`${musculo}-${indice}`}
                                className="rounded-full bg-primary-light/20 px-3 py-2"
                              >
                                <Text className="text-sm text-text-secondary">
                                  {musculo}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                      )}
                    </SeccionFicha>
                  </>
                )}
              </>
            )}

            <View className="mb-4">
              <ClavesSeguridad puntos={maquina.prevencionLesiones} />
            </View>

            <View className="mb-4 flex-row rounded-2xl bg-primary-light/20 p-4">
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={palette.primary}
                accessible={false}
              />
              <View className="ml-3 flex-1">
                <Text className="mb-1 text-base font-bold text-foreground">
                  Entrena con cuidado
                </Text>
                <Text className="text-sm leading-6 text-text-secondary">
                  Esta guía no reemplaza la supervisión de un entrenador.
                </Text>
              </View>
            </View>
            <Text className="text-center text-sm leading-5 text-text-secondary">
              Animaciones: WorkoutX y ExerciseDB V1 (AscendAPI, uso académico no
              comercial) · Ejercicios: wger y free-exercise-db.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
