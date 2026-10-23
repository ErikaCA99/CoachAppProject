import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgresoPasos } from "@/components/onboarding/StepProgress";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/store/onboarding.store";
import { toast } from "@/utils/toast";

/**
 * Onboarding · Paso 3 (final): cómo generar la primera rutina.
 *
 * Cualquiera de las 3 opciones guarda objetivo, nivel y datos físicos en
 * `usuarios/{uid}`, lo que marca el perfil como completo. El layout raíz desbloquea `(app)` y
 * el Home consume `destinoPendiente` para abrir la opción elegida.
 */
export default function RoutineChoiceScreen() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid);
  const setPerfilCompleto = useAuthStore((s) => s.setPerfilCompleto);
  const { objetivo, nivel, datosFisicos, reset, setDestinoPendiente } =
    useOnboardingStore();
  const [guardando, setGuardando] = useState(false);

  const finalizar = async (destino: Href | null) => {
    if (!uid) return;
    if (!objetivo || !nivel) {
      // Llegó aquí sin pasar por el paso 1 (p. ej. recarga en web)
      router.replace("/(onboarding)/goal");
      return;
    }
    if (!datosFisicos) {
      router.replace("/(onboarding)/physical-data");
      return;
    }

    setGuardando(true);
    try {
      await AuthController.guardarDatosOnboarding(uid, {
        objetivo,
        nivel,
        ...datosFisicos,
      });
      reset();
      // Orden importante: primero el destino, luego desbloquear (app).
      setDestinoPendiente(destino);
      setPerfilCompleto(true);
    } catch (error) {
      console.error("Error al completar el onboarding:", error);
      toast.error(
        "No pudimos guardar tus datos. Revisa tu conexión e intenta nuevamente.",
      );
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 bg-primary-light/15 px-5 pt-6">
        <ProgresoPasos
          paso={3}
          onBack={guardando ? undefined : () => router.back()}
        />
        <Text className="text-2xl font-bold text-foreground">
          ¿Cómo quieres tu rutina?
        </Text>
        <Text className="mt-1 text-sm text-text-muted">
          Elige cómo generar tu plan de entrenamiento
        </Text>

        <View className="flex-1 justify-center">
          {/* Generar con IA (recomendado) */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={guardando}
            onPress={() => finalizar("/(app)/routines/generate")}
            accessibilityRole="button"
            className="mb-4 rounded-3xl shadow-md"
          >
            <LinearGradient
              colors={[palette.primary, palette.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 20 }}
            >
              <View className="flex-row items-start justify-between">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-background/20">
                  <MaterialCommunityIcons
                    name="brain"
                    size={26}
                    color={palette.background}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={palette.background}
                />
              </View>
              <View className="mt-4 flex-row items-center">
                <Text className="text-lg font-bold text-background">
                  Generar con IA
                </Text>
                <View className="ml-2 flex-row items-center rounded-full bg-background/25 px-2 py-0.5">
                  <Ionicons
                    name="sparkles"
                    size={10}
                    color={palette.background}
                  />
                  <Text className="ml-1 text-sm font-semibold text-background">
                    Recomendado
                  </Text>
                </View>
              </View>
              <Text className="mt-1 text-sm text-background/90">
                La IA crea una rutina optimizada en base a tu objetivo y nivel
                de experiencia
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Crear personalizada */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={guardando}
            onPress={() => finalizar("/(app)/routines/custom")}
            accessibilityRole="button"
            className="rounded-3xl border border-primary-light bg-background p-5 shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <LinearGradient
                colors={[palette.primary, palette.primaryDark]}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={palette.background}
                />
              </LinearGradient>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.textMuted}
              />
            </View>
            <Text className="mt-4 text-lg font-bold text-foreground">
              Crear personalizada
            </Text>
            <Text className="mt-1 text-sm text-text-muted">
              Diseña tu propia rutina eligiendo los ejercicios, días y enfoque
              de cada sesión
            </Text>
          </TouchableOpacity>
        </View>

        <View className="items-center pb-6">
          {guardando ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <TouchableOpacity
              className="min-h-11 justify-center px-4"
              onPress={() => finalizar(null)}
            >
              <Text className="text-sm font-semibold text-text-muted underline">
                Saltar por ahora
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
