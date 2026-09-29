import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { ProgresoController } from "@/controllers/ProgresoController";
import type { ProgresoFisico } from "@/models/entities/ProgresoFisico";
import type { ConId } from "@/services/firebase/firestoreService";
import { useAuthStore } from "@/store/auth.store";
import { clasificarIMC } from "@/utils/imcCalculator";

const { width: ANCHO_PANTALLA } = Dimensions.get("window");
const MAX_PUNTOS_GRAFICO = 8;

function formatearFecha(fecha: Date): string {
  return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

export default function ProgressScreen() {
  const { user } = useAuthStore();

  const [registros, setRegistros] = useState<ConId<ProgresoFisico>[]>([]);
  const [alturaPerfil, setAlturaPerfil] = useState<number | undefined>();
  const [cargando, setCargando] = useState(true);

  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    const unsubRegistros = ProgresoController.observar(user.uid, (lista) => {
      setRegistros(lista);
      setCargando(false);
    });

    AuthController.obtenerPerfil(user.uid).then((perfil) => {
      if (!activo) return;
      if (perfil?.altura) {
        setAlturaPerfil(perfil.altura);
        setAltura(String(perfil.altura));
      }
    });

    return () => {
      activo = false;
      unsubRegistros();
    };
  }, [user]);

  const ultimoRegistro = registros[registros.length - 1] ?? null;
  const primerRegistro = registros[0] ?? null;

  const diferenciaPeso = useMemo(() => {
    if (!ultimoRegistro || !primerRegistro || registros.length < 2) return null;
    return Number((ultimoRegistro.peso - primerRegistro.peso).toFixed(1));
  }, [ultimoRegistro, primerRegistro, registros.length]);

  const categoriaIMC = ultimoRegistro?.imc
    ? clasificarIMC(ultimoRegistro.imc)
    : null;

  const datosGrafico = useMemo(() => {
    const puntos = registros.slice(-MAX_PUNTOS_GRAFICO);
    return {
      labels: puntos.map((r) =>
        r.creadoEn ? formatearFecha(r.creadoEn.toDate()) : "",
      ),
      datasets: [{ data: puntos.map((r) => r.peso) }],
    };
  }, [registros]);

  const handleRegistrar = async () => {
    if (!user) return;
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura) || alturaPerfil;

    if (!(pesoNum > 0)) {
      Alert.alert("Falta el peso", "Ingresa tu peso actual en kg.");
      return;
    }

    setGuardando(true);
    try {
      await ProgresoController.registrar(user.uid, pesoNum, alturaNum);
      setPeso("");
    } catch (error) {
      console.error("Error al registrar progreso:", error);
      Alert.alert("Error", "No se pudo guardar tu registro.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (registroId: string) => {
    if (!user) return;
    Alert.alert("Eliminar registro", "¿Seguro que quieres eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          ProgresoController.eliminar(user.uid, registroId).catch((error) =>
            console.error("Error al eliminar registro:", error),
          );
        },
      },
    ]);
  };

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-1 text-2xl font-bold text-foreground">Progreso</Text>
      <Text className="mb-6 text-sm text-text-muted">
        Registra tu peso para ver tu evolución
      </Text>

      <View className="mb-6 flex-row gap-3">
        <View className="flex-1 items-center rounded-2xl border border-border p-4">
          <Text className="text-xl font-bold text-foreground">
            {ultimoRegistro ? `${ultimoRegistro.peso} kg` : "—"}
          </Text>
          <Text className="mt-1 text-[11px] text-text-muted">Peso actual</Text>
        </View>
        <View className="flex-1 items-center rounded-2xl border border-border p-4">
          <Text
            className={`text-xl font-bold ${
              diferenciaPeso === null
                ? "text-foreground"
                : diferenciaPeso <= 0
                  ? "text-primary"
                  : "text-accent-strong"
            }`}
          >
            {diferenciaPeso === null
              ? "—"
              : `${diferenciaPeso > 0 ? "+" : ""}${diferenciaPeso} kg`}
          </Text>
          <Text className="mt-1 text-[11px] text-text-muted">Cambio total</Text>
        </View>
        <View className="flex-1 items-center rounded-2xl border border-border p-4">
          <Text className="text-xl font-bold text-foreground">
            {ultimoRegistro?.imc ?? "—"}
          </Text>
          <Text className="mt-1 text-[11px] text-text-muted">
            {categoriaIMC ?? "IMC"}
          </Text>
        </View>
      </View>

      {registros.length >= 2 && (
        <View className="mb-6 items-center overflow-hidden rounded-2xl border border-border py-3">
          <LineChart
            data={datosGrafico}
            width={ANCHO_PANTALLA - 40 - 2}
            height={200}
            fromZero={false}
            chartConfig={{
              backgroundColor: palette.background,
              backgroundGradientFrom: palette.background,
              backgroundGradientTo: palette.background,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(50, 166, 133, ${opacity})`,
              labelColor: () => palette.textMuted,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: palette.primary,
              },
            }}
            bezier
            style={{ borderRadius: 16 }}
          />
        </View>
      )}

      <Text className="mb-3 text-base font-bold text-foreground">
        Registrar peso
      </Text>
      <View className="mb-3 flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 text-xs text-text-muted">Peso (kg)</Text>
          <TextInput
            className="rounded-xl border border-border bg-primary-light/20 p-3 text-base text-foreground"
            keyboardType="numeric"
            value={peso}
            onChangeText={setPeso}
            placeholder="70.5"
            placeholderTextColor="#6b7280"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-xs text-text-muted">Altura (cm)</Text>
          <TextInput
            className="rounded-xl border border-border bg-primary-light/20 p-3 text-base text-foreground"
            keyboardType="numeric"
            value={altura}
            onChangeText={setAltura}
            placeholder="170"
            placeholderTextColor="#6b7280"
          />
        </View>
      </View>
      <TouchableOpacity
        className="mb-8 items-center rounded-2xl bg-primary p-4"
        onPress={handleRegistrar}
        disabled={guardando}
        style={guardando ? { opacity: 0.6 } : undefined}
      >
        <Text className="text-sm font-bold text-background">
          {guardando ? "Guardando..." : "Registrar"}
        </Text>
      </TouchableOpacity>

      <Text className="mb-3 text-base font-bold text-foreground">
        Historial
      </Text>
      {registros.length === 0 ? (
        <Text className="text-center text-sm text-text-muted">
          Aún no tienes registros. ¡Agrega el primero!
        </Text>
      ) : (
        [...registros].reverse().map((registro) => (
          <View
            key={registro.id}
            className="mb-2.5 flex-row items-center justify-between rounded-2xl border border-border p-4"
          >
            <View>
              <Text className="text-sm font-semibold text-foreground">
                {registro.peso} kg
                {registro.imc ? ` · IMC ${registro.imc}` : ""}
              </Text>
              <Text className="mt-0.5 text-xs text-text-muted">
                {registro.creadoEn
                  ? registro.creadoEn.toDate().toLocaleDateString()
                  : "Fecha no disponible"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleEliminar(registro.id)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={palette.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
