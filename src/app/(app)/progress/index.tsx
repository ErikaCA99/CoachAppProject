import { Text, View } from "react-native";

export default function ProgressScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="mb-2 text-2xl font-bold text-foreground">Progreso</Text>
      <Text className="text-sm text-text-muted">Próximamente...</Text>
    </View>
  );
}
