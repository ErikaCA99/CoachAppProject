import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonPrimario } from "@/shared/ui/PrimaryButton";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";

/** Pantalla de bienvenida (solo sin sesión; ver `Stack.Protected` raíz). */
export default function WelcomeScreen() {
  const router = useRouter();
  const { height: alto } = useWindowDimensions();

  return (
    <SafeAreaView className="flex-1 bg-primary-light/15">
      <View className="p-2" style={{ height: alto * 0.58 }}>
        <Image
          className="h-full w-full rounded-3xl"
          resizeMode="cover"
          source={require("@/assets/cover.jpg")}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>

      <View className="flex-1 justify-center px-4">
        <View className="items-center justify-center">
          <Image
            source={require("@/assets/images/coachApp_logo_v4.png")}
            className="h-16 w-56"
            resizeMode="contain"
            accessibilityRole="header"
            accessibilityLabel="CoachApp, guía de máquinas de gimnasio"
          />
        </View>
        <Text className="mx-8 mt-3 text-center text-sm text-text-secondary">
          Disfruta de la mejor experiencia del deporte con rutinas
          personalizadas y guías de ejercicios
        </Text>

        <View className="mt-8">
          <BotonPrimario
            titulo="Empezar"
            onPress={() => router.push("/(auth)/login")}
            icono={
              <Ionicons
                name="rocket-outline"
                size={18}
                color={palette.background}
              />
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
