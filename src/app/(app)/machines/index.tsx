import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MaquinasController";
import type { CategoriaMaquina, Maquina } from "@/models/entities/Maquina";

export default function MachinesScreen() {
  const router = useRouter();
  const [categorias] = useState<CategoriaMaquina[]>(
    MaquinasController.listarCategorias,
  );

  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  const [busqueda, setBusqueda] = useState("");
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [siguienteOffset, setSiguienteOffset] = useState<number | null>(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita que una respuesta vieja (p. ej. de una letra tecleada dos búsquedas
  // atrás) pise los resultados de una búsqueda más reciente si llega tarde.
  const solicitudIdRef = useRef(0);

  const cargar = useCallback(
    async (offset: number, reset: boolean) => {
      const idSolicitud = ++solicitudIdRef.current;
      try {
        if (reset) {
          setCargando(true);
          setError(null);
        } else {
          setCargandoMas(true);
        }

        const resultado = await MaquinasController.listar({
          categoriaId,
          busqueda: busqueda.trim() || undefined,
          offset,
        });

        // Esta respuesta quedó obsoleta: ya se disparó otra búsqueda/filtro
        // más reciente mientras esperábamos. Se descarta en vez de pisar
        // resultados correctos con datos viejos.
        if (idSolicitud !== solicitudIdRef.current) return;

        setMaquinas((prev) =>
          reset ? resultado.items : [...prev, ...resultado.items],
        );
        setSiguienteOffset(resultado.siguienteOffset);
      } catch (err) {
        if (idSolicitud !== solicitudIdRef.current) return;
        console.error("Error al cargar máquinas:", err);
        setError("No se pudieron cargar las máquinas. Verifica tu conexión.");
      } finally {
        if (idSolicitud === solicitudIdRef.current) {
          setCargando(false);
          setCargandoMas(false);
        }
      }
    },
    [categoriaId, busqueda],
  );

  // Recarga (con debounce) cada vez que cambia el filtro de categoría o el texto de búsqueda.
  useEffect(() => {
    const timeout = setTimeout(() => {
      cargar(0, true);
    }, 400);
    return () => clearTimeout(timeout);
  }, [cargar]);

  const cargarMas = useCallback(() => {
    if (siguienteOffset === null || cargandoMas || cargando) return;
    cargar(siguienteOffset, false);
  }, [siguienteOffset, cargandoMas, cargando, cargar]);

  const renderItem = useCallback(
    ({ item }: { item: Maquina }) => (
      <TouchableOpacity
        className="mb-3 flex-row items-center overflow-hidden rounded-2xl border border-border bg-background"
        onPress={() => router.push(`/(app)/machines/${item.id}` as Href)}
      >
        {item.imagenUrl ? (
          <Image
            source={{ uri: item.imagenUrl }}
            className="h-20 w-20"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center bg-primary-light/30">
            <Ionicons
              name="barbell-outline"
              size={28}
              color={palette.primary}
            />
          </View>
        )}
        <View className="flex-1 p-3">
          <Text
            className="text-base font-semibold text-foreground"
            numberOfLines={1}
          >
            {item.nombre}
          </Text>
          <Text className="mt-1 text-xs text-text-muted">{item.categoria}</Text>
          {item.equipo.length > 0 && (
            <Text
              className="mt-0.5 text-[11px] text-text-muted"
              numberOfLines={1}
            >
              {item.equipo.join(", ")}
            </Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.textMuted}
          style={{ marginRight: 12 }}
        />
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-background px-4 pb-3 pt-14">
        <Text className="mb-3 text-2xl font-bold text-foreground">
          Máquinas
        </Text>

        <View className="mb-3 flex-row items-center rounded-2xl border border-border bg-primary-light/20 px-3">
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-sm text-foreground"
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#6b7280"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            className={`mr-2 rounded-full border px-4 py-2 ${
              categoriaId === undefined
                ? "border-primary bg-primary"
                : "border-border bg-background"
            }`}
            onPress={() => setCategoriaId(undefined)}
          >
            <Text
              className={`text-xs font-semibold ${
                categoriaId === undefined
                  ? "text-background"
                  : "text-foreground"
              }`}
            >
              Todas
            </Text>
          </TouchableOpacity>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              className={`mr-2 rounded-full border px-4 py-2 ${
                categoriaId === categoria.id
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              onPress={() => setCategoriaId(categoria.id)}
            >
              <Text
                className={`text-xs font-semibold ${
                  categoriaId === categoria.id
                    ? "text-background"
                    : "text-foreground"
                }`}
              >
                {categoria.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={palette.primary} />
          <Text className="mt-3 text-sm text-text-muted">
            Cargando máquinas...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-center text-sm text-error">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-xl bg-primary px-5 py-2.5"
            onPress={() => cargar(0, true)}
          >
            <Text className="text-sm font-bold text-background">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={maquinas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          onEndReachedThreshold={0.4}
          onEndReached={cargarMas}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-sm text-text-muted">
              No se encontraron máquinas con esos filtros.
            </Text>
          }
          ListFooterComponent={
            cargandoMas ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={palette.primary}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
