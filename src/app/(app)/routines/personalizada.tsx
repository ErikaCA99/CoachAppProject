import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SelectorEjercicios } from "@/components/rutinas/SelectorEjercicios";
import { palette } from "@/constants/palette";
import { useEditorRutinaPersonalizada } from "@/hooks/useEditorRutinaPersonalizada";
import type { EjercicioWger } from "@/models/entities/EjercicioWger";
import { useOnboardingStore } from "@/store/onboarding.store";

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
    else Alert.alert(resultado.titulo, resultado.mensaje);
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

      <Text className="mb-1.5 text-xs font-semibold text-text-muted">
        NOMBRE DE LA RUTINA
      </Text>
      <TextInput
        className="mb-6 rounded-2xl border border-border bg-primary-light/20 p-3.5 text-base text-foreground"
        value={nombreRutina}
        onChangeText={setNombreRutina}
        placeholder="Ej. Mi rutina de fuerza"
      />

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-text-muted">
          DÍAS DE ENTRENAMIENTO
        </Text>
        {puedeAgregarDia && (
          <TouchableOpacity
            className="flex-row items-center rounded-full bg-primary-light/30 px-3 py-1.5"
            onPress={agregarDia}
          >
            <Ionicons name="add" size={16} color={palette.primary} />
            <Text className="ml-1 text-xs font-bold text-primary">
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
            className={`mr-2 flex-row items-center rounded-full border px-4 py-2 ${
              diaActivo === indice
                ? "border-primary bg-primary"
                : "border-border bg-background"
            }`}
            onPress={() => setDiaActivo(indice)}
          >
            <Text
              className={`text-xs font-semibold ${
                diaActivo === indice ? "text-background" : "text-foreground"
              }`}
            >
              Día {dia.dia}
            </Text>
            {puedeQuitarDia && (
              <TouchableOpacity
                className="ml-2"
                onPress={() => quitarDia(indice)}
                hitSlop={8}
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

      <Text className="mb-1.5 text-xs font-semibold text-text-muted">
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
          {ejercicio.imagenUrl ? (
            <Image
              source={{ uri: ejercicio.imagenUrl }}
              className="h-11 w-11 rounded-lg"
            />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary-light/40">
              <Ionicons
                name="barbell-outline"
                size={16}
                color={palette.primary}
              />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text
              className="text-sm font-semibold text-foreground"
              numberOfLines={1}
            >
              {ejercicio.nombre}
            </Text>
            <Text className="text-[11px] text-text-muted">
              {ejercicio.series} series × {ejercicio.repeticiones} reps
            </Text>
          </View>
          <TouchableOpacity onPress={() => quitarEjercicio(indice)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={palette.error} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        className="mb-8 flex-row items-center justify-center rounded-2xl border border-dashed border-primary p-4"
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={18} color={palette.primary} />
        <Text className="ml-2 text-sm font-bold text-primary">
          Agregar ejercicio a este día
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
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
