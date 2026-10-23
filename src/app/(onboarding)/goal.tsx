import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgresoPasos } from "@/components/onboarding/StepProgress";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { SelectorNivel } from "@/components/user/LevelSelector";
import { SelectorObjetivo } from "@/components/user/GoalSelector";
import { useOnboardingStore } from "@/store/onboarding.store";

/**
 * Onboarding · Paso 1: objetivo + nivel de experiencia en una sola pantalla.
 * La selección vive en `useOnboardingStore`; todavía no se guarda en
 * Firestore (eso ocurre en RoutineChoiceScreen, al elegir cómo seguir).
 */
export default function TargetSelectionScreen() {
  const router = useRouter();
  const { objetivo, nivel, setObjetivo, setNivel } = useOnboardingStore();
  const completo = !!objetivo && !!nivel;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 bg-primary-light/15 px-5 pt-6">
        <ProgresoPasos paso={1} />
        <Text className="text-2xl font-bold text-foreground">
          Antes de generar tu rutina
        </Text>
        <Text className="mt-1 text-sm text-text-muted">
          Necesitamos saber tu objetivo y nivel de experiencia
        </Text>

        <ScrollView
          className="mt-6 flex-1"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-3 text-base font-semibold text-foreground">
            Objetivo
          </Text>
          <SelectorObjetivo valor={objetivo} onCambiar={setObjetivo} />

          <Text className="mb-3 mt-4 text-base font-semibold text-foreground">
            Nivel de experiencia
          </Text>
          <SelectorNivel valor={nivel} onCambiar={setNivel} />
          <View className="h-4" />
        </ScrollView>

        <View className="pb-4 pt-2">
          <BotonPrimario
            titulo="Siguiente"
            deshabilitado={!completo}
            onPress={() => router.push("/(onboarding)/physical-data")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
