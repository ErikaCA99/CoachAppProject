import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { DemostracionRutina } from "@/components/routines/ExerciseThumbnail";
import { ErrorCarga } from "@/components/ui/LoadError";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { BarraProgresoEjercicios } from "@/components/workout/ExerciseProgressBar";
import { TarjetaDescanso } from "@/components/workout/RestTimerCard";
import { SeguimientoSeries } from "@/components/workout/SeriesTracker";
import { ResumenEntrenamiento } from "@/components/workout/WorkoutSummary";
import { palette } from "@/constants/palette";
import { useIrAMaquina } from "@/hooks/useGoToMachine";
import { useEntrenamientoGuiado } from "@/hooks/useGuidedWorkout";
import { ejerciciosRealizados, seriesRealizadas } from "@/utils/workoutSession";
import { toast } from "@/utils/toast";

/** Convierte el parámetro `dia` de la ruta en un número de día válido (1..7). */
function leerNumeroDia(param: string | string[] | undefined): number | null {
  const valor = Number(Array.isArray(param) ? param[0] : param);
  return Number.isInteger(valor) && valor >= 1 && valor <= 7 ? valor : null;
}

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const irAMaquina = useIrAMaquina();
  const { dia: diaParam } = useLocalSearchParams<{ dia?: string }>();
  const numeroDia = leerNumeroDia(diaParam);

  const {
    cargando,
    error,
    reintentar,
    dia,
    sesion,
    ejercicioActual,
    terminado,
    hayAvance,
    enDescanso,
    segundosRestantes,
    descansoTotal,
    duracionSegundos,
    guardando,
    completarSerieActual,
    saltarDescanso,
    saltarEjercicioActual,
    finalizar,
  } = useEntrenamientoGuiado(numeroDia);

  const salir = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)");
  }, [router]);

  /** Pide confirmación solo si hay algo que perder. */
  const solicitarSalida = useCallback(() => {
    if (!hayAvance && !terminado) {
      salir();
      return;
    }
    Alert.alert(
      "¿Salir del entrenamiento?",
      terminado
        ? "Si sales ahora, este entrenamiento no se registrará."
        : "Perderás el avance de esta sesión.",
      [
        { text: "Seguir aquí", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: salir },
      ],
    );
  }, [hayAvance, terminado, salir]);

  // El botón "atrás" de Android también pasa por la confirmación.
  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          solicitarSalida();
          return true;
        },
      );
      return () => suscripcion.remove();
    }, [solicitarSalida]),
  );

  const handleFinalizar = async () => {
    const resultado = await finalizar();
    if (resultado.ok) salir();
    else toast.desdeResultado(resultado);
  };

  const botonAtras = (
    <TouchableOpacity
      onPress={solicitarSalida}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Salir del entrenamiento"
      className="h-11 w-11 items-center justify-center rounded-full bg-primary-light/30"
    >
      <Ionicons name="arrow-back" size={22} color={palette.foreground} />
    </TouchableOpacity>
  );

  // ── Estados sin sesión ───────────────────────────────────────────────
  if (error) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorCarga mensaje={error} onReintentar={reintentar} />
      </View>
    );
  }

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!dia || !sesion) {
    return (
      <View
        className="flex-1 bg-background px-5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="items-start">{botonAtras}</View>
        <EmptyState
          icon="barbell-outline"
          title="No encontramos este día"
          description="Elige un día de tu rutina activa para empezar a entrenar."
          actionButton={{
            label: "Ir a mis rutinas",
            icon: "list-outline",
            onPress: () => router.replace("/(app)/routines"),
          }}
        />
      </View>
    );
  }

  if (dia.ejercicios.length === 0) {
    return (
      <View
        className="flex-1 bg-background px-5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="items-start">{botonAtras}</View>
        <EmptyState
          icon="barbell-outline"
          title="Este día no tiene ejercicios"
          description="Agrega ejercicios desde Rutinas o la guía de máquinas y vuelve a intentarlo."
        />
      </View>
    );
  }

  // ── Cierre: resumen y guardado ───────────────────────────────────────
  if (terminado) {
    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="items-start px-5">{botonAtras}</View>
        <View className="flex-1 justify-center px-5">
          <ResumenEntrenamiento
            numeroDia={dia.dia}
            enfoque={dia.enfoque}
            ejerciciosRealizados={ejerciciosRealizados(sesion)}
            ejerciciosTotales={sesion.ejercicios.length}
            seriesRealizadas={seriesRealizadas(sesion)}
            duracionSegundos={duracionSegundos}
          />
        </View>
        <View
          className="border-t border-border px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <BotonPrimario
            titulo={
              ejerciciosRealizados(sesion) === 0
                ? "Salir sin registrar"
                : "Guardar y salir"
            }
            onPress={
              ejerciciosRealizados(sesion) === 0 ? salir : handleFinalizar
            }
            cargando={guardando}
          />
        </View>
      </View>
    );
  }

  // ── Sesión en curso ──────────────────────────────────────────────────
  if (!ejercicioActual) return null;

  const esNuevoEjercicio =
    enDescanso && sesion.serie === 1 && sesion.indice > 0;

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12 }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          {botonAtras}
          <View className="flex-1">
            <Text
              className="text-xl font-bold text-foreground"
              numberOfLines={1}
            >
              {dia.enfoque}
            </Text>
            <Text className="text-sm text-text-secondary">
              Día {dia.dia} · Ejercicio {sesion.indice + 1} de{" "}
              {sesion.ejercicios.length}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <BarraProgresoEjercicios sesion={sesion} />
        </View>

        <View className="mt-4 h-40 items-center justify-center overflow-hidden rounded-[20px] bg-primary-light/35">
          <DemostracionRutina
            ejercicioId={ejercicioActual.maquinaId}
            imagenUrl={ejercicioActual.imagenUrl}
            nombre={ejercicioActual.nombre}
          />
        </View>

        {esNuevoEjercicio ? (
          <Text className="mt-4 text-sm font-semibold text-primary">
            Siguiente ejercicio
          </Text>
        ) : null}
        <Text
          className={`${esNuevoEjercicio ? "mt-1" : "mt-4"} text-2xl font-bold text-foreground`}
        >
          {ejercicioActual.nombre}
        </Text>

        <Text className="mt-4 text-xl font-bold text-foreground">
          {ejercicioActual.series} series × {ejercicioActual.repeticiones}{" "}
          repeticiones
        </Text>
        <View className="mt-3">
          <SeguimientoSeries
            totalSeries={ejercicioActual.series}
            serieActual={sesion.serie}
          />
        </View>

        {enDescanso ? (
          <View className="mt-4">
            <TarjetaDescanso
              segundosRestantes={segundosRestantes}
              segundosTotales={descansoTotal}
              onSaltar={saltarDescanso}
            />
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={() => irAMaquina(ejercicioActual)}
          className="mt-2 min-h-11 flex-row items-center gap-1 self-start"
        >
          <Text className="text-sm font-bold text-primary">
            Ver guía de la máquina
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.primary} />
        </TouchableOpacity>
      </ScrollView>

      <View
        className="gap-2 border-t border-border px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <BotonPrimario
          titulo={
            enDescanso ? "Descansando…" : `Serie ${sesion.serie} completada`
          }
          onPress={completarSerieActual}
          deshabilitado={enDescanso}
        />
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={saltarEjercicioActual}
          className="min-h-11 items-center justify-center"
        >
          <Text className="text-sm font-bold text-text-secondary">
            Saltar ejercicio
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
