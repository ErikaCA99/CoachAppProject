import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { RoutineGeneratingLoader } from "@/components/routines/RoutineGeneratingLoader";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RoutinesController";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type NivelExperiencia,
  type ObjetivoUsuario,
} from "@/models/entities/User";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/store/onboarding.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type Fase = "cargando_perfil" | "formulario" | "generando" | "error";

/**
 * Genera una rutina heurística (IA) usando el objetivo/nivel del perfil.
 * Si el perfil no los tiene guardados todavía, los pide en un mini-formulario
 * antes de generar.
 */
export default function GenerarRutinaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();
  const limpiarDestinoPendiente = useOnboardingStore(
    (s) => s.limpiarDestinoPendiente,
  );

  const [fase, setFase] = useState<Fase>("cargando_perfil");
  const [objetivo, setObjetivo] = useState<ObjetivoUsuario | null>(null);
  const [nivel, setNivel] = useState<NivelExperiencia | null>(null);
  // true cuando la rutina ya se guardó; el loader corre a 100 % y navega.
  const [terminado, setTerminado] = useState(false);

  useEffect(() => {
    limpiarDestinoPendiente();
  }, [limpiarDestinoPendiente]);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    AuthController.obtenerPerfil(user.uid)
      .then((perfil) => {
        if (!activo) return;
        setObjetivo(perfil?.objetivo ?? null);
        setNivel(perfil?.nivel ?? null);
        setFase(perfil?.objetivo && perfil?.nivel ? "generando" : "formulario");
      })
      .catch((error) => {
        // Sin perfil no se puede generar automáticamente: se muestra el
        // formulario para que el usuario elija objetivo y nivel a mano.
        console.warn("No se pudo leer el perfil:", error);
        if (activo) setFase("formulario");
      });

    return () => {
      activo = false;
    };
  }, [user]);

  useEffect(() => {
    if (fase !== "generando" || terminado || !user || !objetivo || !nivel) {
      return;
    }
    let activo = true;

    RutinasController.generarRutinaConIA(user.uid, objetivo, nivel)
      .then(() => {
        if (activo) setTerminado(true);
      })
      .catch((error) => {
        console.error("Error al generar rutina con IA:", error);
        if (activo) setFase("error");
      });

    return () => {
      activo = false;
    };
  }, [fase, terminado, user, objetivo, nivel]);

  const irARutinas = useCallback(() => {
    router.replace("/(app)/routines");
  }, [router]);

  if (fase === "generando") {
    return (
      <RoutineGeneratingLoader terminado={terminado} onTerminar={irARutinas} />
    );
  }

  if (fase === "cargando_perfil") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color={palette.primary} />
        <Text className="mt-4 text-center text-base font-semibold text-foreground">
          Cargando tu perfil...
        </Text>
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
          accessibilityRole="button"
          className="mt-4 rounded-xl bg-primary px-6 py-3"
          onPress={() => {
            setTerminado(false);
            setFase("generando");
          }}
        >
          <Text className="text-sm font-bold text-background">Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 24,
        paddingBottom: 40,
      }}
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
              className={`flex-row items-center min-h-11 rounded-full border px-4 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
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
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
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
        accessibilityRole="button"
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
