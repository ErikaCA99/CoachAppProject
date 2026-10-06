import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Dimensions, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonPrimario } from "@/components/ui/BotonPrimario";
import { palette } from "@/constants/palette";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Pantalla de bienvenida (solo sin sesión; ver `Stack.Protected` raíz). */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#c9fffc]">
      <View className="p-2" style={{ height: SCREEN_HEIGHT * 0.58 }}>
        <Image
          className="h-full w-full rounded-3xl"
          resizeMode="cover"
          source={require("@/assets/portadaApp.jpg")}
        />
      </View>

      <View className="flex-1 justify-center px-4">
        <View className="flex-row items-center justify-center">
          <Image
            source={require("@/assets/images/logo-coachapp.png")}
            className="h-9 w-9 rounded-xl"
          />
          <Text className="ml-2.5 text-2xl font-bold text-white">CoachApp</Text>
        </View>
        <Text className="mx-8 mt-3 text-center text-sm text-gray-300">
          Disfruta de la mejor experiencia del deporte con rutinas
          personalizadas y guías de ejercicios
        </Text>

        <View className="mt-8">
          <BotonPrimario
            titulo="Empezar"
            onPress={() => router.push("/(auth)/LoginScreen")}
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
