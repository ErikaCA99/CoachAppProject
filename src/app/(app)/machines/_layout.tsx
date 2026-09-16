import { Stack } from "expo-router";

import { palette } from "@/constants/palette";

export default function MachinesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.foreground,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Máquinas", headerShown: false }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: "Detalle", headerShown: true }}
      />
    </Stack>
  );
}
