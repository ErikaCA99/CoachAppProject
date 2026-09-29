import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

type ModoAuth = "login" | "registro";

const SUBTITULOS: Record<ModoAuth, string> = {
  login: "Bienvenido de vuelta",
  registro: "Crea tu cuenta gratis",
};

/**
 * Logo + nombre + pestañas "Iniciar Sesión / Registrarse".
 * Las pestañas cambian de pantalla con `replace` para no apilar historial.
 */
export function AuthHeader({ modo }: { modo: ModoAuth }) {
  const router = useRouter();

  const irA = (destino: ModoAuth) => {
    if (destino === modo) return;
    router.replace(
      destino === "login" ? "/(auth)/LoginScreen" : "/(auth)/RegisterScreen",
    );
  };

  return (
    <View className="mb-6 items-center">
      {/* Halo suave detrás del logo */}
      <View className="absolute -top-6 h-40 w-40 rounded-full bg-primary-light/30" />

      <Image
        source={require("@/assets/images/logo-coachapp.png")}
        className="h-14 w-14 rounded-2xl"
        accessibilityIgnoresInvertColors
      />
      <Text className="mt-3 text-2xl font-bold text-foreground">CoachApp</Text>
      <Text className="mt-1 text-sm text-text-muted">{SUBTITULOS[modo]}</Text>

      <View className="mt-6 w-full flex-row rounded-2xl bg-primary-light/30 p-1">
        {(
          [
            { valor: "login", etiqueta: "Iniciar Sesión" },
            { valor: "registro", etiqueta: "Registrarse" },
          ] as const
        ).map((tab) => {
          const activo = tab.valor === modo;
          return (
            <TouchableOpacity
              key={tab.valor}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                activo ? "bg-background shadow-sm" : ""
              }`}
              onPress={() => irA(tab.valor)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
            >
              <Text
                className={`text-sm font-semibold ${
                  activo ? "text-foreground" : "text-text-muted"
                }`}
              >
                {tab.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
