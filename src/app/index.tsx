import { useRouter } from "expo-router";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { palette } from "@/constants/palette";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View
        className="w-full flex-1 p-5"
        style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
      >
        <Image
          className="p-120 h-full w-full rounded-2xl border-2 border-primary"
          source={{
            uri: "https://i.pinimg.com/736x/99/b9/af/99b9af0403cd569dbb9cc451c32e2b35.jpg",
          }}
        />
      </View>
      <View className="flex-1 items-center justify-center rounded-t-3xl bg-primary-light/40 p-5">
        <Text className="mb-4 text-center text-3xl font-bold text-foreground">
          Bienvenidos a CoachApp
        </Text>
        <Text className="mb-8 text-center text-lg text-text-secondary">
          Disfruta de la mejor experiencia del deporte
        </Text>
        <TouchableOpacity
          className="w-4/5 flex-row items-center justify-center rounded-2xl bg-primary p-[18px] shadow-sm"
          onPress={() => router.push("/(auth)/LoginScreen")}
        >
          <Text className="mr-2.5 text-lg font-semibold tracking-wide text-background">
            Empezar
          </Text>
          <View className="ml-1">
            <Svg height="24" width="24" viewBox="0 0 24 24">
              <Path d="M0 0h24v24H0z" fill="none" />
              <Path
                d="M5 13c0-5.088 2.903-9.436 7-11.182C16.097 3.564 19 7.912 19 13c0 .823-.076 1.626-.22 2.403l1.94 1.832a.5.5 0 0 1 .095.603l-2.495 4.575a.5.5 0 0 1-.793.114l-2.234-2.234a1 1 0 0 0-.707-.293H9.414a1 1 0 0 0-.707.293l-2.234 2.234a.5.5 0 0 1-.793-.114l-2.495-4.575a.5.5 0 0 1 .095-.603l1.94-1.832C5.077 14.626 5 13.823 5 13zm1.476 6.696l.817-.817A3 3 0 0 1 9.414 18h5.172a3 3 0 0 1 2.121.879l.817.817.982-1.8-1.1-1.04a2 2 0 0 1-.593-1.82c.124-.664.187-1.345.187-2.036 0-3.87-1.995-7.3-5-8.96C8.995 5.7 7 9.13 7 13c0 .691.063 1.372.187 2.037a2 2 0 0 1-.593 1.82l-1.1 1.039.982 1.8zM12 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
                fill={palette.background}
              />
            </Svg>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
