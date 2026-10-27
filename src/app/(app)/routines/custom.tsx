import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

import { SelectorEjercicios } from "@/components/routines/ExercisePicker";
import { MiniaturaEjercicio } from "@/components/routines/ExerciseThumbnail";
import { Text, TextInput } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { useEditorRutinaPersonalizada } from "@/hooks/useCustomRoutineEditor";
import type { EjercicioWger } from "@/models/entities/WgerExercise";
import { useOnboardingStore } from "@/store/onboarding.store";
import { toast } from "@/utils/toast";

export default function RutinaPersonalizadaScreen() {
  const router = useRouter();
  const limpiarDestinoPendiente = useOnboardingStore(
    (s) => s.limpiarDestinoPendiente,
  );
  const [modalVisible, setModalVisible] = useState(false);

  const {
    nombreRutina,
    setNombreRutina,
    dias,
    diaActivo,
    setDiaActivo,
    diaSeleccionado,
    puedeAgregarDia,
    puedeQuitarDia,
    guardando,
    agregarDia,
    quitarDia,
    actualizarEnfoque,
    agregarEjercicio,
    quitarEjercicio,
    guardar,
  } = useEditorRutinaPersonalizada();

  useEffect(() => {
    limpiarDestinoPendiente();
  }, [limpiarDestinoPendiente]);

  const handleAgregarEjercicio = (ejercicio: EjercicioWger) => {
    agregarEjercicio(ejercicio);
    setModalVisible(false);
  };

  const handleGuardar = async () => {
    const resultado = await guardar();
    if (resultado.ok) router.replace("/(app)/routines");
    else toast.desdeResultado(resultado);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-4 text-2xl font-bold text-foreground">
        Crear rutina personalizada
      </Text>

      <Text className="mb-1.5 text-sm font-semibold text-text-muted">
        NOMBRE DE LA RUTINA
      </Text>
      <TextInput
        className="mb-6 rounded-2xl border border-border bg-primary-light/20 p-3.5 text-base text-foreground"
        value={nombreRutina}
        onChangeText={setNombreRutina}
        placeholder="Ej. Mi rutina de fuerza"
      />

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text-muted">
          DÍAS DE ENTRENAMIENTO
        </Text>
        {puedeAgregarDia && (
          <TouchableOpacity
            accessibilityRole="button"
            className="min-h-11 flex-row items-center rounded-full bg-primary-light/30 px-4"
            onPress={agregarDia}
          >
            <Ionicons name="add" size={16} color={palette.primary} />
            <Text className="ml-1 text-sm font-bold text-primary">
              Agregar día
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
      >
        {dias.map((dia, indice) => (
          <TouchableOpacity
            key={dia.dia}
            className={`mr-2 flex-row items-center min-h-11 rounded-full border px-4 ${
              diaActivo === indice
                ? "border-primary bg-primary"
                : "border-border bg-background"
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: diaActivo === indice }}
            onPress={() => setDiaActivo(indice)}
          >
            <Text
              className={`text-sm font-semibold ${
                diaActivo === indice ? "text-background" : "text-foreground"
              }`}
            >
              Día {dia.dia}
            </Text>
            {puedeQuitarDia && (
              <TouchableOpacity
                className="ml-2"
                accessibilityRole="button"
                accessibilityLabel={`Quitar día ${dia.dia}`}
                hitSlop={14}
                onPress={() => quitarDia(indice)}
              >
                <Ionicons
                  name="close-circle"
                  size={14}
                  color={
                    diaActivo === indice
                      ? palette.background
                      : palette.textMuted
                  }
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="mb-1.5 text-sm font-semibold text-text-muted">
        ENFOQUE DEL DÍA {diaSeleccionado.dia}
      </Text>
      <TextInput
        className="mb-4 rounded-2xl border border-border bg-primary-light/20 p-3.5 text-base text-foreground"
        value={diaSeleccionado.enfoque}
        onChangeText={actualizarEnfoque}
        placeholder="Ej. Pecho y tríceps"
      />

      {diaSeleccionado.ejercicios.map((ejercicio, indice) => (
        <View
          key={`${ejercicio.maquinaId}-${indice}`}
          className="mb-2.5 flex-row items-center rounded-xl border border-border p-2.5"
        >
          <MiniaturaEjercicio
            ejercicioId={ejercicio.maquinaId}
            imagenUrl={ejercicio.imagenUrl}
            nombre={ejercicio.nombre}
            tamano={44}
            radio={10}
          />
          <View className="ml-3 flex-1">
            <Text
              className="text-sm font-semibold text-foreground"
              numberOfLines={1}
            >
              {ejercicio.nombre}
            </Text>
            <Text className="text-sm text-text-muted">
              {ejercicio.series} series × {ejercicio.repeticiones} reps
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quitar ejercicio"
            hitSlop={14}
            onPress={() => quitarEjercicio(indice)}
          >
            <Ionicons name="trash-outline" size={18} color={palette.error} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        accessibilityRole="button"
        className="mb-8 flex-row items-center justify-center rounded-2xl border border-dashed border-primary p-4"
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={18} color={palette.primary} />
        <Text className="ml-2 text-sm font-bold text-primary">
          Agregar ejercicio a este día
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        className="items-center rounded-2xl bg-primary p-4"
        onPress={handleGuardar}
        disabled={guardando}
        style={guardando ? { opacity: 0.6 } : undefined}
      >
        <Text className="text-base font-bold text-background">
          {guardando ? "Guardando..." : "Guardar rutina"}
        </Text>
      </TouchableOpacity>

      <SelectorEjercicios
        visible={modalVisible}
        onCerrar={() => setModalVisible(false)}
        onSeleccionar={handleAgregarEjercicio}
      />
    </ScrollView>
  );
}
