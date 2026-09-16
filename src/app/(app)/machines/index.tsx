import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import axios from "axios";

import { palette } from "@/constants/palette";

const API_URL = "https://wger.de/api/v2/equipment/";

interface Equipment {
  id: number;
  name: string;
}

export default function Machines() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<{ results: Equipment[] }>(API_URL);
      setEquipment(response.data.results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar los equipos";
      setError(message);
      console.error("Error fetching equipment:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const renderItem = useCallback(
    ({ item }: { item: Equipment }) => (
      <View className="mb-3 rounded-xl bg-background p-4 shadow-sm border border-border">
        <Text className="text-base font-semibold text-foreground">
          {item.name}
        </Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: Equipment) => item.id.toString(),
    []
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-5 bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
        <Text className="mt-3 text-sm text-text-secondary">
          Cargando equipos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-5 bg-background">
        <Text className="text-center text-sm text-error">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface/20">
      <FlatList
        data={equipment}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-sm text-text-muted">
            No se encontraron equipos.
          </Text>
        }
      />
    </View>
  );
}
