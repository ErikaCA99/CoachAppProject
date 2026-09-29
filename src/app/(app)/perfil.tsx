import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type NivelExperiencia,
  type ObjetivoUsuario,
  type Usuario,
} from "@/models/entities/Usuario";
import { useAuthStore } from "@/store/auth.store";

export default function PerfilScreen() {
  const { user } = useAuthStore();
  const { signOutFromGoogle } = useGoogleAuth();
  const router = useRouter();

  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = AuthController.observarPerfil(user.uid, (datos) => {
      setPerfil(datos);
      setAltura(datos?.altura ? String(datos.altura) : "");
      setPeso(datos?.pesoActual ? String(datos.pesoActual) : "");
      setCargando(false);
    });

    return unsubscribe;
  }, [user]);

  const handleGuardarMedidas = async () => {
    if (!user) return;
    const alturaNum = parseFloat(altura);
    const pesoNum = parseFloat(peso);

    setGuardando(true);
    try {
      await AuthController.actualizarPerfil(user.uid, {
        altura: alturaNum > 0 ? alturaNum : undefined,
        pesoActual: pesoNum > 0 ? pesoNum : undefined,
      });
      Alert.alert("Listo", "Tus datos se guardaron correctamente.");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      Alert.alert("Error", "No se pudieron guardar tus datos.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarObjetivo = async (objetivo: ObjetivoUsuario) => {
    if (!user) return;
    try {
      await AuthController.actualizarPerfil(user.uid, { objetivo });
    } catch (error) {
      console.error("Error al actualizar objetivo:", error);
    }
  };

  const handleCambiarNivel = async (nivel: NivelExperiencia) => {
    if (!user) return;
    try {
      await AuthController.actualizarPerfil(user.uid, { nivel });
    } catch (error) {
      console.error("Error al actualizar nivel:", error);
    }
  };

  const handleCerrarSesion = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => void signOutFromGoogle(),
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
      contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-primary-light/30"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={22} color={palette.foreground} />
      </TouchableOpacity>

      <View className="mb-8 items-center">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-3xl font-bold text-background">
            {(perfil?.nombre || user?.displayName || "U")
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-bold text-foreground">
          {perfil?.nombre} {perfil?.apellidos}
        </Text>
        <Text className="text-sm text-text-muted">
          {perfil?.email || user?.email}
        </Text>
      </View>

      <Text className="mb-3 text-base font-bold text-foreground">Objetivo</Text>
      <View className="mb-7 flex-row flex-wrap gap-2">
        {(
          Object.entries(OBJETIVOS_USUARIO) as [
            ObjetivoUsuario,
            (typeof OBJETIVOS_USUARIO)[ObjetivoUsuario],
          ][]
        ).map(([valor, info]) => {
          const activo = perfil?.objetivo === valor;
          return (
            <TouchableOpacity
              key={valor}
              className={`rounded-full border px-4 py-2 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              onPress={() => handleCambiarObjetivo(valor)}
            >
              <Text
                className={`text-xs font-semibold ${
                  activo ? "text-background" : "text-foreground"
                }`}
              >
                {info.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="mb-3 text-base font-bold text-foreground">
        Nivel de experiencia
      </Text>
      <View className="mb-7 flex-row flex-wrap gap-2">
        {(
          Object.entries(NIVELES_EXPERIENCIA) as [
            NivelExperiencia,
            (typeof NIVELES_EXPERIENCIA)[NivelExperiencia],
          ][]
        ).map(([valor, info]) => {
          const activo = perfil?.nivel === valor;
          return (
            <TouchableOpacity
              key={valor}
              className={`rounded-full border px-4 py-2 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              onPress={() => handleCambiarNivel(valor)}
            >
              <Text
                className={`text-xs font-semibold ${
                  activo ? "text-background" : "text-foreground"
                }`}
              >
                {info.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="mb-3 text-base font-bold text-foreground">Medidas</Text>
      <View className="mb-2 flex-row gap-3">
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
        <View className="flex-1">
          <Text className="mb-1 text-xs text-text-muted">Peso (kg)</Text>
          <TextInput
            className="rounded-xl border border-border bg-primary-light/20 p-3 text-base text-foreground"
            keyboardType="numeric"
            value={peso}
            onChangeText={setPeso}
            placeholder="70"
            placeholderTextColor="#6b7280"
          />
        </View>
      </View>
      <TouchableOpacity
        className="mb-8 mt-2 items-center rounded-2xl bg-primary p-3.5"
        onPress={handleGuardarMedidas}
        disabled={guardando}
        style={guardando ? { opacity: 0.6 } : undefined}
      >
        <Text className="text-sm font-bold text-background">
          {guardando ? "Guardando..." : "Guardar medidas"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center justify-center rounded-2xl border border-error p-4"
        onPress={handleCerrarSesion}
      >
        <Ionicons name="log-out-outline" size={20} color={palette.error} />
        <Text className="ml-2 text-sm font-bold text-error">Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
