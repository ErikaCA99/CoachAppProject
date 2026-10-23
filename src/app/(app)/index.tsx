import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StatusBar, View } from "react-native";

import { RachaSemanal } from "@/components/home/WeekStreak";
import { AppHeader } from "@/components/ui/AppHeader";
import { EntradaAnimada } from "@/components/ui/AnimatedEntrance";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RoutinesController";
import { EntrenamientosController } from "@/controllers/WorkoutsController";
import type { Rutina } from "@/models/entities/Routine";
import type { Usuario } from "@/models/entities/User";
import type { Entrenamiento } from "@/models/entities/Workout";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/store/onboarding.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();

  const destinoPendiente = useOnboardingStore((s) => s.destinoPendiente);

  // Recién terminado el onboarding: abrir la opción elegida en
  // RoutineChoiceScreen ("Generar con IA" / "Crear personalizada").
  // Se hace desde aquí porque (app) solo existe una vez que el guard raíz
  // lo desbloquea, y el Home es su pantalla inicial.
  useEffect(() => {
    if (destinoPendiente) router.push(destinoPendiente);
  }, [destinoPendiente, router]);

  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [rutinas, setRutinas] = useState<ConId<Rutina>[]>([]);
  const [entrenamientos, setEntrenamientos] = useState<ConId<Entrenamiento>[]>(
    [],
  );

  useEffect(() => {
    if (!user) return;

    const unsubPerfil = AuthController.observarPerfil(user.uid, setPerfil);
    const unsubRutinas = RutinasController.observar(user.uid, setRutinas);
    const unsubEntrenos = EntrenamientosController.observar(
      user.uid,
      setEntrenamientos,
    );

    return () => {
      unsubPerfil();
      unsubRutinas();
      unsubEntrenos();
    };
  }, [user]);

  const rutinaActiva =
    rutinas.find((r) => r.id === perfil?.rutinaActivaId) ?? null;
  const resumenEntrenos = useMemo(
    () => EntrenamientosController.resumen(entrenamientos),
    [entrenamientos],
  );

  const diaSugerido = rutinaActiva
    ? EntrenamientosController.diaSugerido(rutinaActiva, entrenamientos)
    : null;

  // Si ya entrenó hoy, la tarjeta anuncia el día que sigue en vez de "Hoy".
  const yaEntrenoHoy = EntrenamientosController.deHoy(entrenamientos) !== null;
  const diaDeHoy =
    rutinaActiva?.planSemanal.find((d) => d.dia === diaSugerido) ?? null;

  const handleEmpezar = () => {
    if (rutinaActiva && diaSugerido !== null) {
      router.push({
        pathname: "/(app)/train",
        params: { dia: String(diaSugerido) },
      });
    } else {
      router.push(
        rutinaActiva ? "/(app)/routines" : "/(app)/routines/generate",
      );
    }
  };

  const handleEscanear = () => {
    router.push("/(app)/machines/scanner");
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={`Hola, ${
            perfil?.nombre ||
            user?.displayName ||
            user?.email?.split("@")[0] ||
            "Deportista"
          }`}
          subtitle="¿Listo para entrenar?"
          onProfilePress={() => router.push("/(app)/profile")}
        />

        {/* Active Routine Card */}
        <EntradaAnimada>
          <View className="mb-6 rounded-[20px] bg-primary p-6">
            <Text className="mb-1.5 text-lg font-bold text-background">
              {diaDeHoy
                ? `${yaEntrenoHoy ? "Siguiente" : "Hoy"} · Día ${diaDeHoy.dia}`
                : rutinaActiva
                  ? "Mi Rutina Activa"
                  : "Aún no tienes una rutina"}
            </Text>
            <Text className="mb-5 text-sm text-background">
              {diaDeHoy
                ? `${diaDeHoy.enfoque} · ${diaDeHoy.ejercicios.length} ejercicios`
                : rutinaActiva
                  ? `${rutinaActiva.nombre} · ${rutinaActiva.diasPorSemana} días/semana`
                  : "Genera una con IA o arma la tuya en la pestaña Rutinas"}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                className="min-h-11 justify-center rounded-xl bg-background px-5 active:scale-[0.97] active:opacity-85"
                onPress={handleEmpezar}
              >
                <Text className="text-sm font-bold text-primary">
                  {!rutinaActiva
                    ? "Generar rutina"
                    : diaSugerido !== null
                      ? `Empezar Día ${diaSugerido}`
                      : "Continuar"}
                </Text>
              </Pressable>
              {rutinaActiva && (
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 justify-center rounded-xl border border-background px-5 active:scale-[0.97] active:opacity-80"
                  onPress={() => router.push("/(app)/routines")}
                >
                  <Text className="text-sm font-bold text-background">
                    Ver Detalles
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </EntradaAnimada>

        {rutinaActiva && (
          <View className="mb-7">
            <RachaSemanal
              dias={resumenEntrenos.dias}
              rachaActual={resumenEntrenos.rachaActual}
              completadosSemana={resumenEntrenos.completadosSemana}
              diasPorSemana={rutinaActiva.diasPorSemana}
            />
          </View>
        )}

        {/* Acción rápida: escanear una máquina */}
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center rounded-2xl border border-border bg-background p-[18px] active:scale-[0.98] active:bg-primary-light/10"
          onPress={handleEscanear}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-strong">
            <Ionicons name="scan" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Escanear máquina
            </Text>
            <Text className="mt-0.5 text-sm text-text-secondary">
              Identifícala con la cámara y mira cómo usarla
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.textMuted}
          />
        </Pressable>

        <View className="h-[30px]" />
      </ScrollView>
    </View>
  );
}
