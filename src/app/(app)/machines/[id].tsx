import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function MachineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-background p-5">
      <Text className="mb-3 text-xl font-bold text-foreground">
        Detalle de Máquina
      </Text>
      <Text className="text-base text-text-muted">ID: {id}</Text>
    </View>
  );
}
