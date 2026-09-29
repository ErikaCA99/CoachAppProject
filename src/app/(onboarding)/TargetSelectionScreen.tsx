import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonPrimario } from "@/components/ui/BotonPrimario";
import { palette } from "@/constants/palette";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type NivelExperiencia,
  type ObjetivoUsuario,
} from "@/models/entities/Usuario";
import { useOnboardingStore } from "@/store/onboarding.store";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const OBJETIVOS = Object.entries(OBJETIVOS_USUARIO) as [
  ObjetivoUsuario,
  (typeof OBJETIVOS_USUARIO)[ObjetivoUsuario],
][];
const NIVELES = Object.entries(NIVELES_EXPERIENCIA) as [
  NivelExperiencia,
  (typeof NIVELES_EXPERIENCIA)[NivelExperiencia],
][];

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
          {/* Objetivo */}
          <Text className="mb-3 text-base font-semibold text-foreground">
            Objetivo
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {OBJETIVOS.map(([valor, info]) => {
              const activo = objetivo === valor;
              return (
                <TouchableOpacity
                  key={valor}
                  className={`mb-3 w-[48.5%] flex-row items-center rounded-xl border px-3 py-3.5 ${
                    activo
                      ? "border-primary bg-primary-light/30"
                      : "border-primary-light bg-background"
                  }`}
                  onPress={() => setObjetivo(valor)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Ionicons
                    name={info.icono as IoniconName}
                    size={18}
                    color={activo ? palette.primary : palette.textSecondary}
                  />
                  <Text
                    className={`ml-2 flex-1 text-[13px] ${
                      activo ? "font-semibold text-primary" : "text-foreground"
                    }`}
                    numberOfLines={1}
                  >
                    {info.etiqueta}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Nivel de experiencia */}
          <Text className="mb-3 mt-4 text-base font-semibold text-foreground">
            Nivel de experiencia
          </Text>
          {NIVELES.map(([valor, info]) => {
            const activo = nivel === valor;
            return (
              <TouchableOpacity
                key={valor}
                className={`mb-3 flex-row items-center rounded-xl border p-4 ${
                  activo
                    ? "border-primary bg-primary-light/30"
                    : "border-primary-light bg-background"
                }`}
                onPress={() => setNivel(valor)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
              >
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    {info.etiqueta}
                  </Text>
                  <Text className="mt-1 text-xs text-text-muted">
                    {info.descripcion}
                  </Text>
                </View>
                {activo && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={palette.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
          <View className="h-4" />
        </ScrollView>

        <View className="pb-4 pt-2">
          <BotonPrimario
            titulo="Siguiente"
            deshabilitado={!completo}
            onPress={() => router.push("/(onboarding)/RoutineChoiceScreen")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
