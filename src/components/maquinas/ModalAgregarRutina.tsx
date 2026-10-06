import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BotonPrimario } from "@/components/ui/BotonPrimario";
import { palette } from "@/constants/palette";
import { RutinasController } from "@/controllers/RutinasController";
import type { Maquina } from "@/models/entities/Maquina";
import type { Rutina } from "@/models/entities/Rutina";
import type { ConId } from "@/services/firebase/firestoreService";

interface ModalAgregarRutinaProps {
  visible: boolean;
  maquina: Maquina;
  usuarioId: string;
  onCerrar: () => void;
}

const PARAMETROS_POR_DEFECTO = {
  series: 3,
  repeticiones: 12,
  descansoSegundos: 60,
};

function Contador({
  etiqueta,
  valor,
  min,
  max,
  paso = 1,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  onCambiar: (valor: number) => void;
}) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary-light/20 py-2">
      <Text className="text-[11px] font-semibold text-text-muted">
        {etiqueta}
      </Text>
      <View className="mt-1 flex-row items-center">
        <TouchableOpacity
          onPress={() => onCambiar(Math.max(min, valor - paso))}
          accessibilityLabel={`Menos ${etiqueta}`}
          className="p-1"
        >
          <Ionicons
            name="remove-circle-outline"
            size={22}
            color={palette.primary}
          />
        </TouchableOpacity>
        <Text className="mx-2 min-w-[28px] text-center text-base font-bold text-foreground">
          {valor}
        </Text>
        <TouchableOpacity
          onPress={() => onCambiar(Math.min(max, valor + paso))}
          accessibilityLabel={`Más ${etiqueta}`}
          className="p-1"
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={palette.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Hoja inferior para agregar un ejercicio de esta máquina a un día de la
 * rutina activa. Solo se ofrecen los ejercicios que existen en wger, porque
 * las rutinas guardan el id de wger (`maquinaId`).
 */
export function ModalAgregarRutina({
  visible,
  maquina,
  usuarioId,
  onCerrar,
}: ModalAgregarRutinaProps) {
  const router = useRouter();
  const ejercicios = useMemo(
    () => maquina.ejercicios.filter((e) => e.wgerId !== null),
    [maquina],
  );

  const [rutina, setRutina] = useState<ConId<Rutina> | null | undefined>();
  const [indiceEjercicio, setIndiceEjercicio] = useState(0);
  const [dia, setDia] = useState<number | null>(null);
  const [series, setSeries] = useState(PARAMETROS_POR_DEFECTO.series);
  const [repeticiones, setRepeticiones] = useState(
    PARAMETROS_POR_DEFECTO.repeticiones,
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    RutinasController.obtenerActiva(usuarioId)
      .then((r) => {
        if (!activo) return;
        setRutina(r);
        setDia(r?.planSemanal[0]?.dia ?? null);
      })
      .catch((error) => {
        console.error("Error al cargar la rutina activa:", error);
        if (activo) setRutina(null);
      });
    return () => {
      activo = false;
    };
  }, [visible, usuarioId]);

  const guardar = async () => {
    const ejercicio = ejercicios[indiceEjercicio];
    if (!rutina || dia === null || !ejercicio?.wgerId) return;

    setGuardando(true);
    try {
      await RutinasController.agregarEjercicioADia(usuarioId, rutina.id, dia, {
        maquinaId: ejercicio.wgerId,
        maquinaCatalogoId: maquina.id,
        nombre: ejercicio.nombre,
        imagenUrl: null,
        series,
        repeticiones,
        descansoSegundos: PARAMETROS_POR_DEFECTO.descansoSegundos,
      });
      onCerrar();
      Alert.alert(
        "Listo",
        `"${ejercicio.nombre}" se agregó al día ${dia} de tu rutina.`,
      );
    } catch (error) {
      Alert.alert(
        "No se pudo agregar",
        error instanceof Error ? error.message : "Intenta nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onCerrar} />
      <View className="max-h-[80%] rounded-t-3xl bg-background px-5 pb-8 pt-3">
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-primary-light" />
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">
            Agregar a mi rutina
          </Text>
          <TouchableOpacity onPress={onCerrar} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={palette.foreground} />
          </TouchableOpacity>
        </View>
        <Text className="mb-4 text-xs text-text-muted">{maquina.nombre}</Text>

        {rutina === undefined ? (
          <ActivityIndicator
            color={palette.primary}
            style={{ marginVertical: 24 }}
          />
        ) : rutina === null ? (
          <View className="items-center py-4">
            <Ionicons
              name="calendar-outline"
              size={36}
              color={palette.textMuted}
            />
            <Text className="mt-2 text-center text-sm text-text-secondary">
              Todavía no tienes una rutina activa.
            </Text>
            <View className="mt-4 w-full">
              <BotonPrimario
                titulo="Crear una rutina"
                onPress={() => {
                  onCerrar();
                  router.push("/(app)/routines" as Href);
                }}
              />
            </View>
          </View>
        ) : ejercicios.length === 0 ? (
          <Text className="py-4 text-center text-sm text-text-secondary">
            Esta máquina no tiene ejercicios que se puedan agregar a una rutina.
          </Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Ejercicio
            </Text>
            {ejercicios.map((e, i) => {
              const activo = i === indiceEjercicio;
              return (
                <TouchableOpacity
                  key={`${e.wgerId}-${i}`}
                  className={`mb-2 flex-row items-center rounded-xl border p-3 ${
                    activo
                      ? "border-primary bg-primary-light/25"
                      : "border-primary-light/70"
                  }`}
                  onPress={() => setIndiceEjercicio(i)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Ionicons
                    name={activo ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={activo ? palette.primary : palette.textMuted}
                  />
                  <Text className="ml-2 flex-1 text-sm text-foreground">
                    {e.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Día · {rutina.nombre}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {rutina.planSemanal.map((d) => {
                const activo = d.dia === dia;
                return (
                  <TouchableOpacity
                    key={d.dia}
                    className={`rounded-xl border px-3 py-2 ${
                      activo
                        ? "border-primary bg-primary"
                        : "border-primary-light/70"
                    }`}
                    onPress={() => setDia(d.dia)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        activo ? "text-background" : "text-foreground"
                      }`}
                    >
                      Día {d.dia}
                    </Text>
                    <Text
                      className={`max-w-[120px] text-[10px] ${
                        activo ? "text-background/90" : "text-text-muted"
                      }`}
                      numberOfLines={1}
                    >
                      {d.enfoque}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-3">
              <Contador
                etiqueta="Series"
                valor={series}
                min={1}
                max={10}
                onCambiar={setSeries}
              />
              <Contador
                etiqueta="Repeticiones"
                valor={repeticiones}
                min={1}
                max={50}
                onCambiar={setRepeticiones}
              />
            </View>

            <View className="mt-5">
              <BotonPrimario
                titulo="Agregar"
                onPress={guardar}
                cargando={guardando}
                deshabilitado={dia === null}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
