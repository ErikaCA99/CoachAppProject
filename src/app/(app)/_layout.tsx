import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { palette } from "@/constants/palette";

/**
 * Tabs de la app autenticada. La protección de sesión y de onboarding vive en
 * el layout raíz (`Stack.Protected`): si este layout se monta, ya hay usuario
 * y perfil completo, así que aquí no se valida nada.
 */
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="machines"
        options={{
          title: "Máquinas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progreso",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="routines" options={{ href: null }} />
      <Tabs.Screen
        name="nutricion"
        options={{
          title: "Nutrición",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      {/* href: null => navegable con router.push, pero oculta de la tab bar */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
    </Tabs>
  );
}
