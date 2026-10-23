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
        // Las etiquetas de la barra son la excepción al mínimo de 14 px: con
        // cinco pestañas en 360 dp no caben más grandes.
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "SplineSans_600SemiBold",
        },
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
        name="routines"
        options={{
          title: "Rutinas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
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
        name="nutrition"
        options={{
          title: "Nutrición",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
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
      {/* Perfil: href: null => navegable con router.push (avatar de la cabecera), pero oculto de la tab bar */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      {/* Entrenar hoy: pantalla completa (sin tab bar) para no distraer durante la sesión */}
      <Tabs.Screen
        name="train"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
