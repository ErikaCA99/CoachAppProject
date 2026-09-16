import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    doc,
    getDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Modal,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { palette } from "@/constants/palette";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import { db } from "../../services/firebase/firebase";
import { useAuthStore } from "../../store/auth.store";

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { signOutFromGoogle } = useGoogleAuth();
  const [userData, setUserData] = useState<any>(null);
  const [currentRoutine, setCurrentRoutine] = useState<any>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [weeklyStats] = useState({
    entrenamientos: 12,
    estaSemana: 3,
    racha: 5,
  });

  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
        await loadExistingRoutine(user.uid);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadExistingRoutine = async (userId: string) => {
    try {
      const routineDoc = await getDoc(doc(db, "routines", userId));
      if (routineDoc.exists()) {
        setCurrentRoutine(routineDoc.data());
      }
    } catch (error) {
      console.error("Error loading routine:", error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-[26px] font-bold text-foreground">
              Hola, {userData?.firstName || user?.displayName || "Usuario"}
            </Text>
            <Text className="mt-1 text-sm text-text-muted">
              ¿Listo para entrenar?
            </Text>
          </View>
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            onPress={signOutFromGoogle}
          >
            <Ionicons name="log-out-outline" size={22} color={palette.background} />
          </TouchableOpacity>
        </View>

        {/* Active Routine Card */}
        <LinearGradient
          colors={[palette.primary, palette.accent, palette.accentStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, marginBottom: 24 }}
        >
          <Text className="mb-1.5 text-lg font-bold text-background">
            Mi Rutina Activa
          </Text>
          <Text className="mb-5 text-sm text-background/80">
            {currentRoutine
              ? `${currentRoutine.routine?.name || "Entrenamiento de Fuerza"} - Día ${currentRoutine.routine?.currentDay || 2}`
              : "Entrenamiento de Fuerza - Día 2"}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity className="rounded-xl bg-background px-5 py-2.5">
              <Text className="text-sm font-bold text-primary">Continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl bg-background/25 px-5 py-2.5"
              onPress={() => setShowRoutineModal(true)}
            >
              <Text className="text-sm font-bold text-background">
                Ver Detalles
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View className="mb-7 flex-row justify-between gap-2.5">
          <View className="flex-1 items-center rounded-2xl border border-border bg-background p-4">
            <Ionicons name="trending-up" size={22} color={palette.primary} />
            <Text className="mt-2 text-xl font-bold text-foreground">
              {weeklyStats.entrenamientos}
            </Text>
            <Text className="mt-1 text-[11px] text-text-muted">
              Entrenamientos
            </Text>
          </View>
          <View className="flex-1 items-center rounded-2xl border border-border bg-background p-4">
            <Ionicons name="calendar" size={22} color={palette.accent} />
            <Text className="mt-2 text-xl font-bold text-foreground">
              {weeklyStats.estaSemana}
            </Text>
            <Text className="mt-1 text-[11px] text-text-muted">
              Esta Semana
            </Text>
          </View>
          <View className="flex-1 items-center rounded-2xl border border-border bg-background p-4">
            <Ionicons name="trending-up" size={22} color={palette.accentStrong} />
            <Text className="mt-2 text-xl font-bold text-foreground">
              {weeklyStats.racha} días
            </Text>
            <Text className="mt-1 text-[11px] text-text-muted">Racha</Text>
          </View>
        </View>

        {/* Explore Section */}
        <Text className="mb-4 text-xl font-bold text-foreground">Explorar</Text>

        <TouchableOpacity
          className="mb-3 flex-row items-center rounded-2xl border border-border border-l-[3px] border-l-primary bg-background p-[18px]"
          onPress={() => {
            /* TODO: AI routine generation */
          }}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="sparkles" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Rutina con IA
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-muted">
              Genera una rutina personalizada
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-3 flex-row items-center rounded-2xl border border-border border-l-[3px] border-l-accent bg-background p-[18px]"
          onPress={() => router.push("/(app)/machines" as any)}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <Ionicons name="grid" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Catálogo de Máquinas
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-muted">
              Explora todas las máquinas
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-3 flex-row items-center rounded-2xl border border-border border-l-[3px] border-l-accent-strong bg-background p-[18px]"
          onPress={() => {
            /* TODO: AR scanner */
          }}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-strong">
            <Ionicons name="scan" size={24} color={palette.background} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              Escanear Máquina
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-muted">
              Usa AR para identificar
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </TouchableOpacity>

        <View className="h-[30px]" />
      </ScrollView>

      {/* Routine Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRoutineModal}
        onRequestClose={() => setShowRoutineModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60">
          <View className="max-h-[80%] w-[90%] rounded-3xl border border-border bg-background p-6">
            <Text className="mb-4 text-center text-xl font-bold text-foreground">
              Tu Rutina
            </Text>
            <ScrollView className="mb-3">
              {currentRoutine?.routine?.weeklySchedule?.map(
                (day: any, index: number) => (
                  <View
                    key={index}
                    className="mb-3 rounded-2xl bg-primary-light/25 p-4"
                  >
                    <Text className="mb-2.5 text-base font-bold text-foreground">
                      Día {day.day}: {day.focus}
                    </Text>
                    {day.exercises.map((exercise: any, exIndex: number) => (
                      <TouchableOpacity
                        key={exIndex}
                        className="mb-2 rounded-lg border border-border bg-background p-3"
                        onPress={() => {
                          setShowRoutineModal(false);
                          router.push(
                            `/machines/${exercise.id}` as any
                          );
                        }}
                      >
                        <Text className="text-sm font-semibold text-foreground">
                          {exercise.name}
                        </Text>
                        <Text className="mt-1 text-xs text-text-muted">
                          {exercise.sets} series × {exercise.reps} reps
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}
            </ScrollView>
            <TouchableOpacity
              className="items-center rounded-2xl bg-primary p-4"
              onPress={() => setShowRoutineModal(false)}
            >
              <Text className="text-base font-bold text-background">
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
