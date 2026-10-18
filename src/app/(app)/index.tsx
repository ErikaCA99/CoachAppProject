import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";

import { AppHeader } from "@/components/ui/AppHeader";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { ProgresoController } from "@/controllers/ProgresoController";
import { RutinasController } from "@/controllers/RutinasController";
import type { Rutina } from "@/models/entities/Rutina";
import type { Usuario } from "@/models/entities/Usuario";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/store/onboarding.store";

export default function HomeScreen() {
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
  const [totalRegistrosProgreso, setTotalRegistrosProgreso] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unsubPerfil = AuthController.observarPerfil(user.uid, setPerfil);
    const unsubRutinas = RutinasController.observar(user.uid, setRutinas);

    let activo = true;
    ProgresoController.listar(user.uid)
      .then((registros) => {
        if (activo) setTotalRegistrosProgreso(registros.length);
      })
      .catch((error) => console.warn("No se pudo contar el progreso:", error));

    return () => {
      activo = false;
      unsubPerfil();
      unsubRutinas();
    };
  }, [user]);

  const rutinaActiva =
    rutinas.find((r) => r.id === perfil?.rutinaActivaId) ?? null;
  const totalEjerciciosRutina =
    rutinaActiva?.planSemanal.reduce(
      (acc, dia) => acc + dia.ejercicios.length,
      0,
    ) ?? 0;

  const handleEscanear = () => {
    router.push("/(app)/machines/escaner");
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 50 }}
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
          onProfilePress={() => router.push("/(app)/perfil")}
        />

        {/* Active Routine Card */}
        <LinearGradient
          colors={[palette.primary, palette.accent, palette.accentStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, marginBottom: 24 }}
        >
          <Text className="mb-1.5 text-lg font-bold text-background">
            {rutinaActiva ? "Mi Rutina Activa" : "Aún no tienes una rutina"}
          </Text>
          <Text className="mb-5 text-sm text-background/80">
            {rutinaActiva
              ? `${rutinaActiva.nombre} · ${rutinaActiva.diasPorSemana} días/semana`
              : "Genera una con IA o arma la tuya en la pestaña Rutinas"}
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className="rounded-xl bg-background px-5 py-2.5 active:scale-[0.97] active:opacity-85"
              onPress={() =>
                router.push(
                  rutinaActiva ? "/(app)/routines" : "/(app)/routines/generar",
                )
              }
            >
              <Text className="text-sm font-bold text-primary">
                {rutinaActiva ? "Continuar" : "Generar rutina"}
              </Text>
            </Pressable>
            {rutinaActiva && (
              <Pressable
                className="rounded-xl bg-background/25 px-5 py-2.5 active:scale-[0.97] active:opacity-80"
                onPress={() => router.push("/(app)/routines")}
              >
                <Text className="text-sm font-bold text-background">
                  Ver Detalles
                </Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View className="mb-7 flex-row justify-between gap-2.5">
          <View className="flex-1 items-center rounded-2xl border border-border bg-background p-4">
            <Ionicons name="barbell" size={22} color={palette.primary} />
            <Text className="mt-2 text-xl font-bold text-foreground">
              {totalEjerciciosRutina}
            </Text>
            <Text className="mt-1 text-xs text-text-secondary">
              Ejercicios activos
            </Text>
          </View>
          <View className="flex-1 items-center rounded-2xl border border-border bg-background p-4">
            <Ionicons name="calendar" size={22} color={palette.accent} />
            <Text className="mt-2 text-xl font-bold text-foreground">
              {rutinaActiva?.diasPorSemana ?? 0}
            </Text>
            <Text className="mt-1 text-xs text-text-secondary">
              Días/semana
            </Text>
          </View>
          <View className="flex-1 items-center rounded-2xl border border-border bg-background p-4">
            <Ionicons
              name="trending-up"
              size={22}
              color={palette.accentStrong}
            />
            <Text className="mt-2 text-xl font-bold text-foreground">
              {totalRegistrosProgreso}
            </Text>
            <Text className="mt-1 text-xs text-text-secondary">
              Registros de peso
            </Text>
          </View>
        </View>

        {/* Explore Section */}
        <Text className="mb-4 text-xl font-bold text-foreground">Explorar</Text>

        <Pressable
          className="mb-3 flex-row items-center rounded-2xl border border-border border-l-[3px] border-l-primary bg-background p-[18px] active:scale-[0.98] active:bg-primary-light/10"
          onPress={() => router.push("/(app)/routines/generar")}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="sparkles" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Rutina con IA
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-secondary">
              Genera una rutina personalizada
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.textMuted}
          />
        </Pressable>

        <Pressable
          className="mb-3 flex-row items-center rounded-2xl border border-border border-l-[3px] border-l-accent bg-background p-[18px] active:scale-[0.98] active:bg-primary-light/10"
          onPress={() => router.push("/(app)/machines")}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <Ionicons name="grid" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Catálogo de Máquinas
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-secondary">
              Explora todas las máquinas
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.textMuted}
          />
        </Pressable>

        <Pressable
          className="mb-3 flex-row items-center rounded-2xl border border-border border-l-[3px] border-l-accent-strong bg-background p-[18px] active:scale-[0.98] active:bg-primary-light/10"
          onPress={handleEscanear}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-strong">
            <Ionicons name="scan" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Escanear Máquina
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-secondary">
              Usa AR para identificar (próximamente)
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
