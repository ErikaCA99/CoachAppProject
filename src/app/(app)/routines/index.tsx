import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { AppHeader } from "@/components/ui/AppHeader";
import { ErrorCarga } from "@/components/ui/LoadError";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RoutinesController";
import { useErrorDeCarga } from "@/hooks/useLoadError";
import { useIrAMaquina } from "@/hooks/useGoToMachine";
import type { EjercicioRutina, Rutina } from "@/models/entities/Routine";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function RutinaActivaCard({
  rutina,
  onIrAMaquina,
  onEmpezarDia,
}: {
  rutina: ConId<Rutina>;
  onIrAMaquina: (ejercicio: EjercicioRutina) => void;
  onEmpezarDia: (numeroDia: number) => void;
}) {
  const [diaExpandido, setDiaExpandido] = useState<number | null>(
    rutina.planSemanal[0]?.dia ?? null,
  );

  return (
    <View className="mb-2 rounded-2xl border border-primary/40 bg-primary-light/15 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-foreground">
            {rutina.nombre}
          </Text>
          <Text className="text-sm text-text-muted">
            {rutina.diasPorSemana} días/semana
          </Text>
        </View>
        <View className="rounded-full bg-primary px-3 py-1">
          <Text className="text-sm font-bold text-background">ACTIVA</Text>
        </View>
      </View>

      {rutina.planSemanal.map((dia) => {
        const expandido = diaExpandido === dia.dia;
        return (
          <View
            key={dia.dia}
            className="mb-2 overflow-hidden rounded-xl bg-background"
          >
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center justify-between p-3.5 active:bg-primary-light/10"
              onPress={() => setDiaExpandido(expandido ? null : dia.dia)}
            >
              <Text className="flex-1 pr-2 text-sm font-bold text-foreground">
                Día {dia.dia}: {dia.enfoque}
              </Text>
              <Ionicons
                name={expandido ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.textMuted}
              />
            </Pressable>
            {expandido && (
              <View className="px-3.5 pb-3.5">
                {dia.ejercicios.map((ejercicio, indice) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`${ejercicio.maquinaId}-${indice}`}
                    className="mb-2 flex-row items-center rounded-lg border border-border p-2.5 active:scale-[0.98] active:bg-primary-light/10"
                    onPress={() => onIrAMaquina(ejercicio)}
                  >
                    {ejercicio.imagenUrl ? (
                      <Image
                        source={{ uri: ejercicio.imagenUrl }}
                        className="h-10 w-10 rounded-md"
                      />
                    ) : (
                      <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-light/40">
                        <Ionicons
                          name="barbell-outline"
                          size={16}
                          color={palette.primary}
                        />
                      </View>
                    )}
                    <View className="ml-2.5 flex-1">
                      <Text
                        className="text-sm font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {ejercicio.nombre}
                      </Text>
                      <Text className="mt-0.5 text-base font-bold text-foreground">
                        {ejercicio.series} series × {ejercicio.repeticiones}{" "}
                        reps
                      </Text>
                      <Text className="text-sm text-text-secondary">
                        Descanso {ejercicio.descansoSegundos} s
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {dia.ejercicios.length === 0 ? (
                  <Text className="text-sm text-text-muted">
                    Sin ejercicios en este día.
                  </Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    className="mt-1 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
                    onPress={() => onEmpezarDia(dia.dia)}
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color={palette.background}
                    />
                    <Text className="text-sm font-bold text-background">
                      Entrenar este día
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();

  const irAMaquina = useIrAMaquina();

  const [rutinas, setRutinas] = useState<ConId<Rutina>[]>([]);
  const [rutinaActivaId, setRutinaActivaId] = useState<string | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [cargandoRutinas, setCargandoRutinas] = useState(true);
  const { error, intento, reportar, reintentar } = useErrorDeCarga();

  useEffect(() => {
    if (!user) return;

    const unsubPerfil = AuthController.observarPerfil(
      user.uid,
      (perfil) => {
        setRutinaActivaId(perfil?.rutinaActivaId ?? null);
        setCargandoPerfil(false);
      },
      (causa) => reportar("perfil", causa),
    );

    const unsubRutinas = RutinasController.observar(
      user.uid,
      (lista) => {
        setRutinas(lista);
        setCargandoRutinas(false);
      },
      (causa) => reportar("rutinas", causa),
    );

    return () => {
      unsubPerfil();
      unsubRutinas();
    };
  }, [user, intento, reportar]);

  const rutinaActiva = rutinas.find((r) => r.id === rutinaActivaId) ?? null;
  const otrasRutinas = rutinas.filter((r) => r.id !== rutinaActivaId);

  const handleActivar = async (rutinaId: string) => {
    if (!user) return;
    await RutinasController.activar(user.uid, rutinaId);
  };

  const handleEliminar = (rutinaId: string) => {
    if (!user) return;
    Alert.alert("Eliminar rutina", "¿Seguro que quieres eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          RutinasController.eliminar(user.uid, rutinaId).catch((error) =>
            console.error("Error al eliminar rutina:", error),
          );
        },
      },
    ]);
  };

  if (error) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorCarga mensaje={error} onReintentar={reintentar} />
      </View>
    );
  }

  if (cargandoPerfil || cargandoRutinas) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
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
      <AppHeader
        title="Rutinas"
        subtitle={
          rutinaActiva
            ? "Tu plan de entrenamiento actual"
            : "Aún no tienes una rutina activa"
        }
        onProfilePress={() => router.push("/(app)/profile")}
      />

      {rutinaActiva ? (
        <RutinaActivaCard
          // key fuerza a React a remontar el componente (y reiniciar su
          // estado `diaExpandido`) cuando cambia la rutina activa; sin esto,
          // React reutiliza la misma instancia y el día expandido queda
          // "pegado" al de la rutina anterior.
          key={rutinaActiva.id}
          rutina={rutinaActiva}
          onIrAMaquina={irAMaquina}
          onEmpezarDia={(numeroDia) =>
            router.push({
              pathname: "/(app)/train",
              params: { dia: String(numeroDia) },
            })
          }
        />
      ) : (
        <View className="mb-4 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center rounded-2xl border border-primary bg-primary-light/20 p-5 active:scale-[0.98] active:opacity-85"
            onPress={() => router.push("/(app)/routines/generate")}
          >
            <Ionicons name="sparkles" size={28} color={palette.primary} />
            <Text className="mt-2 text-center text-sm font-bold text-foreground">
              Generar con IA
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center rounded-2xl border border-accent-strong bg-accent/10 p-5 active:scale-[0.98] active:opacity-85"
            onPress={() => router.push("/(app)/routines/custom")}
          >
            <Ionicons name="create" size={28} color={palette.accentStrong} />
            <Text className="mt-2 text-center text-sm font-bold text-foreground">
              Crear personalizada
            </Text>
          </Pressable>
        </View>
      )}

      {rutinaActiva && (
        <View className="mt-4 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center rounded-2xl border border-border p-3.5 active:scale-[0.98] active:bg-primary-light/10"
            onPress={() => router.push("/(app)/routines/generate")}
          >
            <Text className="text-sm font-bold text-foreground">
              Generar otra con IA
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center rounded-2xl border border-border p-3.5 active:scale-[0.98] active:bg-primary-light/10"
            onPress={() => router.push("/(app)/routines/custom")}
          >
            <Text className="text-sm font-bold text-foreground">
              Crear personalizada
            </Text>
          </Pressable>
        </View>
      )}

      {otrasRutinas.length > 0 && (
        <View className="mt-8">
          <Text className="mb-3 text-base font-bold text-foreground">
            Historial de rutinas
          </Text>
          {otrasRutinas.map((rutina) => (
            <View
              key={rutina.id}
              className="mb-2.5 flex-row items-center rounded-2xl border border-border p-4"
            >
              <View className="flex-1 pr-2">
                <Text className="text-sm font-semibold text-foreground">
                  {rutina.nombre}
                </Text>
                <Text className="mt-0.5 text-sm text-text-secondary">
                  {rutina.diasPorSemana} días/semana ·{" "}
                  {rutina.tipo !== "ia"
                    ? "Personalizada"
                    : rutina.origenPlan === "modelo"
                      ? `Generada con IA · modelo v${rutina.versionModelo}`
                      : rutina.origenPlan === "heuristica"
                        ? "Generada con IA · reglas de respaldo"
                        : "Generada con IA"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                className="mr-4 min-h-11 justify-center rounded-lg bg-primary px-4 active:scale-95 active:opacity-85"
                onPress={() => handleActivar(rutina.id)}
              >
                <Text className="text-sm font-bold text-background">
                  Activar
                </Text>
              </Pressable>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-lg border border-error active:scale-95 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Eliminar rutina"
                onPress={() => handleEliminar(rutina.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={palette.error}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
