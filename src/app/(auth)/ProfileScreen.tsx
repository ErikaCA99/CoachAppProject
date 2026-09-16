import { Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="mb-2 text-2xl font-bold text-foreground">Perfil</Text>
      <Text className="text-sm text-text-muted">Próximamente...</Text>
    </View>
  );
}
