import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SelectorEjercicios } from "@/components/routines/ExercisePicker";
import { MiniaturaEjercicio } from "@/components/routines/ExerciseThumbnail";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import type { Rutina } from "@/models/entities/Routine";
import type { EjercicioWger } from "@/models/entities/WgerExercise";

interface Props {
  rutina: Rutina;
  rutinaActual?: string;
  guardando: boolean;
  puedeEditar: boolean;
  error: string | null;
  onSalir: () => void;
  onGuardar: (activar: boolean) => void;
  onReemplazar: (
    dia: number,
    indice: number,
    ejercicio: EjercicioWger,
  ) => boolean;
}

export function RoutinePreview({
  rutina,
  rutinaActual,
  guardando,
  puedeEditar,
  error,
  onSalir,
  onGuardar,
  onReemplazar,
}: Props) {
  const insets = useSafeAreaInsets();
  const [dia, setDia] = useState(0);
  const [reemplazo, setReemplazo] = useState<number | null>(null);
  const seleccionado = rutina.planSemanal[dia];
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis rutinas y descartar borrador"
          disabled={guardando}
          accessibilityState={{ disabled: guardando }}
          onPress={onSalir}
          className="min-h-11 flex-row items-center gap-1 pr-2"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={palette.textSecondary}
            accessible={false}
          />
          <Text className="text-sm font-semibold text-text-secondary">
            Volver
          </Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          className="text-sm font-bold text-foreground"
        >
          VISTA PREVIA
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={guardando}
          accessibilityState={{ disabled: guardando }}
          onPress={onSalir}
          className="min-h-11 justify-center pl-2"
        >
          <Text className="text-sm font-semibold text-text-secondary">
            Descartar
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="self-start rounded-full bg-primary-light/30 px-3 py-2">
          <Text className="text-sm font-bold uppercase text-primary-dark">
            Borrador generado por IA
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          className="mt-4 text-2xl font-bold text-foreground"
        >
          {rutina.nombre}
        </Text>
        <Text className="mt-2 text-base text-text-secondary">
          {rutina.diasPorSemana} días por semana · Basado en tu perfil
        </Text>
        <Text className="mt-2 text-sm text-text-secondary">
          Revisa cada día y cambia los ejercicios que necesites antes de
          guardar.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 20 }}
        >
          {rutina.planSemanal.map((d, i) => (
            <Pressable
              key={d.dia}
              accessibilityRole="tab"
              accessibilityState={{ selected: dia === i }}
              onPress={() => setDia(i)}
              className={`min-h-11 justify-center rounded-xl border px-4 py-3 ${
                dia === i
                  ? "border-primary bg-primary"
                  : "border-border bg-primary-light/15"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  dia === i ? "text-background" : "text-text-secondary"
                }`}
              >
                Día {d.dia}: {d.enfoque}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {seleccionado?.ejercicios.map((e, i) => (
          <View
            key={`${e.maquinaId}-${i}`}
            className="mb-3 flex-row items-center gap-3 rounded-xl border border-border p-3"
          >
            <MiniaturaEjercicio
              ejercicioId={e.maquinaId}
              imagenUrl={e.imagenUrl}
              nombre={e.nombre}
              tamano={44}
            />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {i + 1}. {e.nombre}
              </Text>
              <Text className="mt-1 text-sm text-text-secondary">
                {e.series} series × {e.repeticiones} reps · Descanso{" "}
                {e.descansoSegundos} s
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cambiar ${e.nombre}`}
              disabled={!puedeEditar}
              accessibilityState={{ disabled: !puedeEditar }}
              onPress={() => setReemplazo(i)}
              className={`h-11 w-11 items-center justify-center rounded-xl bg-primary-light/30 ${
                puedeEditar ? "" : "opacity-40"
              }`}
            >
              <Ionicons
                name="swap-horizontal"
                size={22}
                color={palette.primary}
                accessible={false}
              />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <View
        className="border-t border-border bg-primary-light/15 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="mb-3 flex-row gap-2">
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={palette.textSecondary}
            accessible={false}
          />
          <Text className="flex-1 text-sm text-text-secondary">
            {rutinaActual
              ? `Si activas esta rutina, «${rutinaActual}» pasará a tus rutinas anteriores.`
              : "Al activarla será tu rutina principal. También puedes guardarla solo en tus rutinas anteriores."}
          </Text>
        </View>
        {error && (
          <Text accessibilityRole="alert" className="mb-3 text-sm text-error">
            {error}
          </Text>
        )}
        <BotonPrimario
          titulo={guardando ? "Guardando…" : "Activar como mi rutina principal"}
          cargando={guardando}
          onPress={() => onGuardar(true)}
          icono={
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={palette.background}
            />
          }
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: guardando }}
          disabled={guardando}
          onPress={() => onGuardar(false)}
          className={`mt-2 min-h-12 items-center justify-center rounded-xl bg-primary-light/30 px-3 py-3 active:opacity-80 ${
            guardando ? "opacity-60" : ""
          }`}
        >
          <Text className="text-center text-sm font-semibold text-text-secondary">
            Solo guardar en mis rutinas por ahora
          </Text>
        </Pressable>
      </View>
      <SelectorEjercicios
        visible={reemplazo !== null}
        onCerrar={() => setReemplazo(null)}
        onSeleccionar={(ejercicio) => {
          if (reemplazo !== null) onReemplazar(dia, reemplazo, ejercicio);
          setReemplazo(null);
        }}
      />
    </View>
  );
}
