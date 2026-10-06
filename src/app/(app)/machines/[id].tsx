import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ImagenStorage } from "@/components/maquinas/ImagenStorage";
import { ModalAgregarRutina } from "@/components/maquinas/ModalAgregarRutina";
import { ListaPuntos, SeccionFicha } from "@/components/maquinas/SeccionFicha";
import { TarjetaEjercicioGif } from "@/components/maquinas/TarjetaEjercicioGif";
import { BotonPrimario } from "@/components/ui/BotonPrimario";
import { palette } from "@/constants/palette";
import { EjerciciosWgerController } from "@/controllers/EjerciciosWgerController";
import { MaquinasController } from "@/controllers/MaquinasController";
import type { EjercicioWger } from "@/models/entities/EjercicioWger";
import type {
  EjercicioGif,
  EjercicioMaquina,
  Maquina,
} from "@/models/entities/Maquina";
import { useAuthStore } from "@/store/auth.store";

const ALTO_PORTADA = 300;
/** Máximo de fotos de variantes en la galería, para no descargar decenas. */
const MAX_VARIANTES = 8;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function buscarEjercicioRelacionado(
  maquina: Maquina,
  ejercicioGif: EjercicioGif,
): EjercicioMaquina | null {
  const candidatos = [
    ejercicioGif.nombre,
    ejercicioGif.nombreOriginal,
    ejercicioGif.musculoObjetivo,
  ].map(normalizar);

  for (const ejercicio of maquina.ejercicios) {
    const nombreEjercicio = normalizar(ejercicio.nombre);
    if (
      candidatos.some(
        (candidato) =>
          candidato === nombreEjercicio ||
          candidato.includes(nombreEjercicio) ||
          nombreEjercicio.includes(candidato),
      )
    ) {
      return ejercicio;
    }
  }

  return null;
}

interface DetalleEjercicioGenerado {
  categoria: string;
  descripcion: string;
  gruposMusculares: string[];
  instrucciones: string[];
}

function generarDetalleEjercicio(
  maquina: Maquina,
  ejercicioGif: EjercicioGif,
): DetalleEjercicioGenerado {
  const secundarios = maquina.musculosSecundarios.slice(0, 2);
  const musculos = [ejercicioGif.musculoObjetivo, ...secundarios].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );
  const categoria = maquina.categoria || "Fortalecimiento";
  const objetivoPorDificultad: Record<EjercicioGif["dificultad"], string> = {
    Principiante:
      "aprender la técnica base con control del movimiento y postura segura",
    Intermedio:
      "desarrollar fuerza e hipertrofia manteniendo una ejecución estable",
    Avanzado:
      "aumentar intensidad y control bajo mayor carga sin perder técnica",
  };

  const descripcion =
    `${ejercicioGif.nombre} en ${maquina.nombre} está orientado a trabajar principalmente ${ejercicioGif.musculoObjetivo.toLowerCase()}. ` +
    `Se recomienda para ${objetivoPorDificultad[ejercicioGif.dificultad]}.`;

  const instrucciones = [
    "Ajusta asiento, respaldo o polea para que la articulación principal quede alineada con el eje de la máquina.",
    `Inicia el movimiento de forma controlada, concentrando el esfuerzo en ${ejercicioGif.musculoObjetivo.toLowerCase()} y evitando impulsos.`,
    "Regresa lentamente a la posición inicial, manteniendo tensión muscular y respiración constante.",
    ...maquina.prevencionLesiones.slice(0, 2),
  ];

  return {
    categoria,
    descripcion,
    gruposMusculares: musculos.length ? musculos : maquina.musculosPrincipales,
    instrucciones,
  };
}

export default function MachineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid);

  const [maquina, setMaquina] = useState<Maquina | null | undefined>();
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
        if (activo) setMaquina(null);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  const volver = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/(app)/machines" as Href);

  if (maquina === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (maquina === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Ionicons name="alert-circle-outline" size={40} color={palette.error} />
        <Text className="mt-3 text-center text-sm text-error">
          No se encontró esta máquina.
        </Text>
        <TouchableOpacity className="mt-4" onPress={volver}>
          <Text className="font-bold text-primary">Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const variantes = maquina.variantes
    .filter((v) => v.imagen && v.imagen !== maquina.imagenPrincipal)
    .slice(0, MAX_VARIANTES);

  const abrirDetalleEjercicio = async (ejercicioGif: EjercicioGif) => {
    setEjercicioGifSeleccionado(ejercicioGif);
    setDetalleEjercicio(null);
    setDetalleGenerado(null);
    setMensajeDetalleEjercicio(null);
    setModalEjercicio(true);
    setCargandoDetalleEjercicio(true);

    const relacionado = buscarEjercicioRelacionado(maquina, ejercicioGif);
    const wgerId = relacionado?.wgerId ?? null;
    if (!wgerId) {
      setDetalleGenerado(generarDetalleEjercicio(maquina, ejercicioGif));
      setCargandoDetalleEjercicio(false);
      return;
    }

    try {
      const detalle = await EjerciciosWgerController.obtenerPorId(wgerId);
      if (!detalle) {
        setDetalleGenerado(generarDetalleEjercicio(maquina, ejercicioGif));
        return;
      }
      setDetalleEjercicio(detalle);
    } catch (error) {
      console.error("Error al cargar detalle del ejercicio:", error);
      setDetalleGenerado(generarDetalleEjercicio(maquina, ejercicioGif));
    } finally {
      setCargandoDetalleEjercicio(false);
    }
  };

  return (
    <View className="flex-1 bg-primary-light/15">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Portada */}
        <View style={{ height: ALTO_PORTADA }} className="bg-white">
          <ImagenStorage
            ruta={maquina.imagenPrincipal}
            style={{ width: "100%", height: ALTO_PORTADA }}
            accessibilityLabel={maquina.nombre}
          />
          <LinearGradient
            colors={["transparent", "rgba(242, 248, 246, 0.95)"]}
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
            className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm"
            style={{ top: insets.top + 8 }}
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color={palette.foreground} />
          </TouchableOpacity>
          <View
            className="absolute right-4 rounded-full bg-background px-3 py-1 shadow-sm"
            style={{ top: insets.top + 14 }}
          >
            <Text className="text-[11px] font-semibold text-primary">
              {maquina.categoria}
            </Text>
          </View>
        </View>

        <View className="px-4">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {maquina.categoria}
          </Text>
          <Text className="mb-4 text-2xl font-bold text-foreground">
            {maquina.nombre}
          </Text>

          {/* Realidad aumentada */}
          <TouchableOpacity
            activeOpacity={0.85}
            className="mb-4 overflow-hidden rounded-2xl"
            onPress={() =>
              router.push(
                `/(app)/machines/escaner?maquinaId=${maquina.id}` as Href,
              )
            }
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[palette.accentStrong, palette.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={palette.background}
              />
              <Text className="ml-2 text-sm font-bold text-background">
                Ver en Realidad Aumentada
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <SeccionFicha titulo="Descripción" icono="document-text-outline">
            <Text className="text-[13px] leading-5 text-text-secondary">
              {maquina.descripcion}
            </Text>
          </SeccionFicha>

          <SeccionFicha titulo="Músculos" icono="body-outline">
            <View className="flex-row flex-wrap gap-2">
              {maquina.musculosPrincipales.map((m) => (
                <View
                  key={m}
                  className="flex-row items-center rounded-full bg-primary-light/40 px-3 py-1"
                >
                  <Text className="text-xs font-semibold text-primary">
                    {m}
                  </Text>
                  <Ionicons
                    name="star"
                    size={10}
                    color={palette.primary}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              ))}
              {maquina.musculosSecundarios.map((m) => (
                <View
                  key={m}
                  className="rounded-full border border-primary-light px-3 py-1"
                >
                  <Text className="text-xs text-text-secondary">{m}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-2 text-[10px] text-text-muted">
              ★ músculo principal
            </Text>
          </SeccionFicha>

          {maquina.ejerciciosGif.length > 0 && (
            <SeccionFicha
              titulo="Ejercicios y uso correcto"
              icono="play-circle-outline"
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {maquina.ejerciciosGif.map((e) => (
                  <TarjetaEjercicioGif
                    key={e.workoutxId}
                    ejercicio={e}
                    onPress={() => abrirDetalleEjercicio(e)}
                  />
                ))}
              </ScrollView>
            </SeccionFicha>
          )}

          <SeccionFicha titulo="Cómo usarla" icono="list-outline">
            {maquina.instrucciones.map((paso, i) => (
              <View key={i} className="mb-3 flex-row">
                <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Text className="text-xs font-bold text-background">
                    {i + 1}
                  </Text>
                </View>
                <Text className="flex-1 text-[13px] leading-5 text-text-secondary">
                  {paso}
                </Text>
              </View>
            ))}
          </SeccionFicha>

          <SeccionFicha
            titulo="Errores comunes"
            icono="close-circle-outline"
            variante="error"
          >
            <ListaPuntos
              puntos={maquina.erroresComunes}
              icono="close"
              colorIcono={palette.accentStrong}
            />
          </SeccionFicha>

          <SeccionFicha
            titulo="Seguridad"
            icono="alert-circle-outline"
            variante="alerta"
          >
            <ListaPuntos
              puntos={maquina.prevencionLesiones}
              icono="warning-outline"
              colorIcono={palette.accentStrong}
            />
          </SeccionFicha>

          {variantes.length > 0 && (
            <SeccionFicha
              titulo="Así puede verse en tu gimnasio"
              icono="images-outline"
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {variantes.map((v) => (
                  <View
                    key={v.handle}
                    className="mr-3 w-32 overflow-hidden rounded-xl border border-primary-light/60 bg-white"
                  >
                    <ImagenStorage
                      ruta={v.imagen}
                      style={{ width: "100%", aspectRatio: 1 }}
                    />
                    <Text
                      className="p-1.5 text-[10px] text-text-muted"
                      numberOfLines={2}
                    >
                      {v.nombre}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </SeccionFicha>
          )}

          <Text className="mb-2 text-center text-[10px] leading-4 text-text-muted">
            Animaciones: WorkoutX · Ejercicios: wger y free-exercise-db · Fotos:
            Chelo Sports.{"\n"}
            Esta guía no reemplaza la supervisión de un entrenador.
          </Text>
        </View>
      </ScrollView>

      {/* Acción fija */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-primary-light/60 bg-background px-4 pt-3"
        style={{ paddingBottom: 12 }}
      >
        <BotonPrimario
          titulo="Agregar a Mi Rutina"
          onPress={() => setModalRutina(true)}
        />
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
        transparent
        animationType="slide"
        onRequestClose={() => setModalEjercicio(false)}
      >
        <Pressable
          className="flex-1 bg-black/35"
          onPress={() => setModalEjercicio(false)}
        />
        <View className="max-h-[78%] rounded-t-3xl bg-background px-5 pb-8 pt-3">
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-primary-light" />
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="flex-1 text-lg font-bold text-foreground">
              {detalleEjercicio?.nombre ?? ejercicioGifSeleccionado?.nombre}
            </Text>
            <TouchableOpacity
              onPress={() => setModalEjercicio(false)}
              accessibilityLabel="Cerrar detalle del ejercicio"
            >
              <Ionicons name="close" size={24} color={palette.foreground} />
            </TouchableOpacity>
          </View>

          {ejercicioGifSeleccionado && (
            <View className="mb-3 rounded-xl bg-primary-light/20 px-3 py-2">
              <Text className="text-xs font-semibold text-primary">
                Dificultad: {ejercicioGifSeleccionado.dificultad}
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Músculo objetivo: {ejercicioGifSeleccionado.musculoObjetivo}
              </Text>
            </View>
          )}

          {ejercicioGifSeleccionado && (
            <View className="mb-3">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Demostración (GIF)
              </Text>
              <View className="overflow-hidden rounded-xl bg-white">
                <ImagenStorage
                  ruta={ejercicioGifSeleccionado.gifPath}
                  style={{ width: "100%", aspectRatio: 1.2 }}
                  iconoVacio="film-outline"
                  accessibilityLabel={`GIF de ${ejercicioGifSeleccionado.nombre}`}
                />
              </View>
            </View>
          )}

          {cargandoDetalleEjercicio ? (
            <View className="items-center py-6">
              <ActivityIndicator color={palette.primary} />
              <Text className="mt-2 text-xs text-text-muted">
                Cargando detalle del ejercicio...
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {detalleEjercicio && (
                <>
                  {detalleEjercicio.imagenUrl && (
                    <View className="mb-3">
                      <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        Imagen del ejercicio
                      </Text>
                      <View className="overflow-hidden rounded-xl bg-white">
                        <Image
                          source={{ uri: detalleEjercicio.imagenUrl }}
                          style={{ width: "100%", aspectRatio: 1.2 }}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  )}

                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Categoría
                  </Text>
                  <Text className="mb-3 text-sm text-foreground">
                    {detalleEjercicio.categoria}
                  </Text>

                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    ¿Para qué sirve?
                  </Text>
                  <Text className="mb-3 text-sm leading-5 text-text-secondary">
                    {detalleEjercicio.descripcion}
                  </Text>

                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Músculos trabajados
                  </Text>
                  <Text className="mb-3 text-sm text-text-secondary">
                    {detalleEjercicio.gruposMusculares.join(", ") ||
                      "No disponible"}
                  </Text>

                  {detalleEjercicio.instrucciones.length > 0 && (
                    <>
                      <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        Cómo hacerlo
                      </Text>
                      <View className="mb-3 mt-1">
                        {detalleEjercicio.instrucciones.map((paso, i) => (
                          <View key={i} className="mb-2 flex-row">
                            <Text className="mr-2 text-xs font-bold text-primary">
                              {i + 1}.
                            </Text>
                            <Text className="flex-1 text-sm text-text-secondary">
                              {paso}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {!detalleEjercicio && detalleGenerado && (
                <>
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Categoría
                  </Text>
                  <Text className="mb-3 text-sm text-foreground">
                    {detalleGenerado.categoria}
                  </Text>

                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    ¿Para qué sirve?
                  </Text>
                  <Text className="mb-3 text-sm leading-5 text-text-secondary">
                    {detalleGenerado.descripcion}
                  </Text>

                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Músculos trabajados
                  </Text>
                  <Text className="mb-3 text-sm text-text-secondary">
                    {detalleGenerado.gruposMusculares.join(", ")}
                  </Text>

                  <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Cómo hacerlo
                  </Text>
                  <View className="mb-3 mt-1">
                    {detalleGenerado.instrucciones.map((paso, i) => (
                      <View key={i} className="mb-2 flex-row">
                        <Text className="mr-2 text-xs font-bold text-primary">
                          {i + 1}.
                        </Text>
                        <Text className="flex-1 text-sm text-text-secondary">
                          {paso}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {mensajeDetalleEjercicio && (
                <Text className="text-sm text-text-secondary">
                  {mensajeDetalleEjercicio}
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
