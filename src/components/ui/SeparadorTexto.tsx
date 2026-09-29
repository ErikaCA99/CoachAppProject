import { Text, View } from "react-native";

/** Línea horizontal con un texto centrado ("o continúa con"). */
export function SeparadorTexto({ texto }: { texto: string }) {
  return (
    <View className="my-5 flex-row items-center">
      <View className="h-px flex-1 bg-primary-light" />
      <Text className="mx-3 text-xs text-text-muted">{texto}</Text>
      <View className="h-px flex-1 bg-primary-light" />
    </View>
  );
}
