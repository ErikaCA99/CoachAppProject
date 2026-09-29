import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RutinasController";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type NivelExperiencia,
  type ObjetivoUsuario,
} from "@/models/entities/Usuario";
import { useAuthStore } from "@/store/auth.store";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type Fase = "cargando_perfil" | "formulario" | "generando" | "error";

/**
 * Genera una rutina heurística (IA) usando el objetivo/nivel del perfil.
 * Si el perfil no los tiene guardados todavía, los pide en un mini-formulario
 * antes de generar.
 */
export default function GenerarRutinaScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [fase, setFase] = useState<Fase>("cargando_perfil");
  const [objetivo, setObjetivo] = useState<ObjetivoUsuario | null>(null);
  const [nivel, setNivel] = useState<NivelExperiencia | null>(null);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    AuthController.obtenerPerfil(user.uid).then((perfil) => {
      if (!activo) return;
      setObjetivo(perfil?.objetivo ?? null);
      setNivel(perfil?.nivel ?? null);
      setFase(perfil?.objetivo && perfil?.nivel ? "generando" : "formulario");
    });

    return () => {
      activo = false;
    };
  }, [user]);

  useEffect(() => {
    if (fase !== "generando" || !user || !objetivo || !nivel) return;
    let activo = true;

    RutinasController.generarRutinaConIA(user.uid, objetivo, nivel)
      .then(() => {
        if (activo) router.replace("/(app)/routines");
      })
      .catch((error) => {
        console.error("Error al generar rutina con IA:", error);
        if (activo) setFase("error");
      });

    return () => {
      activo = false;
    };
  }, [fase, user, objetivo, nivel, router]);

  if (fase === "cargando_perfil" || fase === "generando") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color={palette.primary} />
        <Text className="mt-4 text-center text-base font-semibold text-foreground">
          {fase === "generando"
            ? "Generando tu rutina personalizada..."
            : "Cargando tu perfil..."}
        </Text>
        {fase === "generando" && (
          <Text className="mt-2 text-center text-sm text-text-muted">
            Estamos eligiendo los mejores ejercicios para tu objetivo
          </Text>
        )}
      </View>
    );
  }

  if (fase === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Ionicons name="alert-circle-outline" size={40} color={palette.error} />
        <Text className="mt-3 text-center text-sm text-error">
          No se pudo generar tu rutina. Verifica tu conexión e intenta de nuevo.
        </Text>
        <TouchableOpacity
          className="mt-4 rounded-xl bg-primary px-6 py-3"
          onPress={() => setFase("generando")}
        >
          <Text className="text-sm font-bold text-background">Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-2 text-2xl font-bold text-foreground">
        Antes de generar tu rutina
      </Text>
      <Text className="mb-6 text-sm text-text-muted">
        Necesitamos saber tu objetivo y nivel de experiencia
      </Text>

      <Text className="mb-3 text-base font-bold text-foreground">Objetivo</Text>
      <View className="mb-6 flex-row flex-wrap gap-2">
        {(
          Object.entries(OBJETIVOS_USUARIO) as [
            ObjetivoUsuario,
            (typeof OBJETIVOS_USUARIO)[ObjetivoUsuario],
          ][]
        ).map(([valor, info]) => {
          const activo = objetivo === valor;
          return (
            <TouchableOpacity
              key={valor}
              className={`flex-row items-center rounded-full border px-4 py-2.5 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              onPress={() => setObjetivo(valor)}
            >
              <Ionicons
                name={info.icono as IoniconName}
                size={16}
                color={activo ? palette.background : palette.primary}
              />
              <Text
                className={`ml-2 text-xs font-semibold ${
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
      <View className="mb-8 gap-2">
        {(
          Object.entries(NIVELES_EXPERIENCIA) as [
            NivelExperiencia,
            (typeof NIVELES_EXPERIENCIA)[NivelExperiencia],
          ][]
        ).map(([valor, info]) => {
          const activo = nivel === valor;
          return (
            <TouchableOpacity
              key={valor}
              className={`rounded-2xl border p-4 ${
                activo
                  ? "border-primary bg-primary-light/30"
                  : "border-border bg-background"
              }`}
              onPress={() => setNivel(valor)}
            >
              <Text className="text-sm font-bold text-foreground">
                {info.etiqueta}
              </Text>
              <Text className="mt-1 text-xs text-text-muted">
                {info.descripcion}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        className={`items-center rounded-2xl p-4 ${
          objetivo && nivel ? "bg-primary" : "bg-text-muted"
        }`}
        disabled={!objetivo || !nivel}
        onPress={() => setFase("generando")}
      >
        <Text className="text-base font-bold text-background">
          Generar mi rutina
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
