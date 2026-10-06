import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { EjerciciosWgerController } from "@/controllers/EjerciciosWgerController";
import { RutinasController } from "@/controllers/RutinasController";
import type { EjercicioWger } from "@/models/entities/EjercicioWger";
import type { DiaRutina, EjercicioRutina } from "@/models/entities/Rutina";
import { useAuthStore } from "@/store/auth.store";

const MAX_DIAS = 7;

function crearDiaVacio(numero: number): DiaRutina {
  return { dia: numero, enfoque: "", ejercicios: [] };
}

/** Modal de búsqueda para elegir un ejercicio del catálogo de máquinas. */
function SelectorEjercicios({
  visible,
  onCerrar,
  onSeleccionar,
}: {
  visible: boolean;
  onCerrar: () => void;
  onSeleccionar: (ejercicio: EjercicioWger) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<EjercicioWger[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      setCargando(true);
      EjerciciosWgerController.listar({
        busqueda: busqueda.trim() || undefined,
      })
        .then((resultado) => setResultados(resultado.items))
        .catch((error) => console.error("Error al buscar ejercicios:", error))
        .finally(() => setCargando(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [visible, busqueda]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View className="flex-1 bg-background pt-14">
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Text className="text-lg font-bold text-foreground">
            Elegir ejercicio
          </Text>
          <TouchableOpacity onPress={onCerrar}>
            <Ionicons name="close" size={26} color={palette.foreground} />
          </TouchableOpacity>
        </View>

        <View className="mx-5 mb-3 flex-row items-center rounded-2xl border border-border bg-primary-light/20 px-3">
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-sm text-foreground"
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#6b7280"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {cargando ? (
          <ActivityIndicator
            style={{ marginTop: 24 }}
            color={palette.primary}
          />
        ) : (
          <FlatList
            data={resultados}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 20, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mb-2.5 flex-row items-center rounded-xl border border-border p-2.5"
                onPress={() => onSeleccionar(item)}
              >
                {item.imagenUrl ? (
                  <Image
                    source={{ uri: item.imagenUrl }}
                    className="h-12 w-12 rounded-lg"
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary-light/40">
                    <Ionicons
                      name="barbell-outline"
                      size={18}
                      color={palette.primary}
                    />
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {item.nombre}
                  </Text>
                  <Text className="text-[11px] text-text-muted">
                    {item.categoria}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={palette.primary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text className="mt-10 text-center text-sm text-text-muted">
                No se encontraron ejercicios.
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

export default function RutinaPersonalizadaScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [nombreRutina, setNombreRutina] = useState("Mi rutina personalizada");
  const [dias, setDias] = useState<DiaRutina[]>([crearDiaVacio(1)]);
  const [diaActivo, setDiaActivo] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const agregarDia = () => {
    if (dias.length >= MAX_DIAS) return;
    setDias((prev) => [...prev, crearDiaVacio(prev.length + 1)]);
    setDiaActivo(dias.length);
  };

  const quitarDia = (indice: number) => {
    if (dias.length <= 1) return;
    const nuevaCantidad = dias.length - 1;

    setDias((prev) =>
      prev
        .filter((_, i) => i !== indice)
        .map((dia, i) => ({ ...dia, dia: i + 1 })),
    );

    // El día activo debe seguir apuntando al mismo contenido, no a la misma
    // posición: si se borra un día ANTES del activo, todo se recorre un
    // lugar a la izquierda y hay que decrementar; si se borra el propio día
    // activo, el foco pasa al que quedó en su lugar (o al último si era el
    // último); si se borra uno DESPUÉS, el activo no se mueve.
    setDiaActivo((prev) => {
      if (indice < prev) return prev - 1;
      if (indice === prev) return Math.min(prev, nuevaCantidad - 1);
      return prev;
    });
  };

  const actualizarEnfoque = (texto: string) => {
    setDias((prev) =>
      prev.map((dia, i) =>
        i === diaActivo ? { ...dia, enfoque: texto } : dia,
      ),
    );
  };

  const agregarEjercicio = (maquina: EjercicioWger) => {
    const nuevoEjercicio: EjercicioRutina = {
      maquinaId: maquina.id,
      nombre: maquina.nombre,
      imagenUrl: maquina.imagenUrl,
      series: 3,
      repeticiones: 12,
      descansoSegundos: 60,
    };

    setDias((prev) =>
      prev.map((dia, i) =>
        i === diaActivo
          ? { ...dia, ejercicios: [...dia.ejercicios, nuevoEjercicio] }
          : dia,
      ),
    );
    setModalVisible(false);
  };

  const quitarEjercicio = (ejercicioIndice: number) => {
    setDias((prev) =>
      prev.map((dia, i) =>
        i === diaActivo
          ? {
              ...dia,
              ejercicios: dia.ejercicios.filter(
                (_, j) => j !== ejercicioIndice,
              ),
            }
          : dia,
      ),
    );
  };

  const handleGuardar = async () => {
    if (!user) return;

    if (!nombreRutina.trim()) {
      Alert.alert("Falta el nombre", "Ponle un nombre a tu rutina.");
      return;
    }

    const totalEjercicios = dias.reduce(
      (acc, dia) => acc + dia.ejercicios.length,
      0,
    );
    if (totalEjercicios === 0) {
      Alert.alert(
        "Sin ejercicios",
        "Agrega al menos un ejercicio a algún día antes de guardar.",
      );
      return;
    }

    setGuardando(true);
    try {
      await RutinasController.crearRutinaPersonalizada(
        user.uid,
        nombreRutina.trim(),
        dias,
      );
      router.replace("/(app)/routines");
    } catch (error) {
      console.error("Error al guardar rutina personalizada:", error);
      Alert.alert("Error", "No se pudo guardar tu rutina. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const diaSeleccionado = dias[diaActivo];

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
        {dias.length < MAX_DIAS && (
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
            {dias.length > 1 && (
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
        onSeleccionar={agregarEjercicio}
      />
    </ScrollView>
  );
}
