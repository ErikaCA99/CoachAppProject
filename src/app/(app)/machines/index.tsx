import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChipFiltro } from "@/components/maquinas/ChipFiltro";
import { TarjetaMaquina } from "@/components/maquinas/TarjetaMaquina";
import { palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MaquinasController";
import {
  TIPOS_MAQUINA,
  type Maquina,
  type TipoMaquina,
} from "@/models/entities/Maquina";

const TIPOS = Object.entries(TIPOS_MAQUINA) as [
  TipoMaquina,
  (typeof TIPOS_MAQUINA)[TipoMaquina],
][];

/**
 * Guía de Máquinas: catálogo de las máquinas del gimnasio (Firestore).
 * El catálogo completo se descarga una vez y se filtra en memoria.
 */
export default function MachinesScreen() {
  const router = useRouter();

  const [catalogo, setCatalogo] = useState<Maquina[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | undefined>();
  const [tipo, setTipo] = useState<TipoMaquina | undefined>();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Descarga (o recarga) el catálogo. Los setState van en callbacks, no en el cuerpo del efecto. */
  const cargar = useCallback((forzar = false) => {
    const recarga = forzar ? MaquinasController.recargar() : Promise.resolve();
    return recarga
      .then(() =>
        Promise.all([
          MaquinasController.listar(),
          MaquinasController.listarCategorias(),
        ]),
      )
      .then(([maquinas, cats]) => {
        setCatalogo(maquinas);
        setCategorias(cats);
        setError(null);
      })
      .catch((err) => {
        console.error("Error al cargar el catálogo de máquinas:", err);
        setError("No se pudo cargar el catálogo. Verifica tu conexión.");
      })
      .finally(() => {
        setCargando(false);
        setRefrescando(false);
      });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtradas = useMemo(
    () => MaquinasController.filtrar(catalogo, { busqueda, categoria, tipo }),
    [catalogo, busqueda, categoria, tipo],
  );

  const hayFiltros = useMemo(
    () => !!busqueda.trim() || !!categoria || !!tipo,
    [busqueda, categoria, tipo],
  );

  const irADetalle = useCallback(
    (id: string) => router.push(`/(app)/machines/${id}` as Href),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Maquina }) => (
      <TarjetaMaquina maquina={item} onPress={() => irADetalle(item.id)} />
    ),
    [irADetalle],
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="flex-1 bg-primary-light/15">
        {/* Encabezado */}
        <View className="px-4 pb-3 pt-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">
                Guía de Máquinas
              </Text>
              <Text className="mt-0.5 text-sm text-primary">
                {hayFiltros
                  ? `${filtradas.length} de ${catalogo.length} máquinas`
                  : `${catalogo.length} máquinas`}
              </Text>
            </View>
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-strong"
              onPress={() => router.push("/(app)/machines/escaner" as Href)}
              accessibilityLabel="Escanear una máquina"
            >
              <Ionicons name="scan" size={22} color={palette.background} />
            </TouchableOpacity>
          </View>

          <View className="mt-4 flex-row items-center rounded-2xl border border-primary-light bg-background px-3">
            <Ionicons name="search" size={18} color={palette.textMuted} />
            <TextInput
              className="ml-2 flex-1 py-2.5 text-sm text-foreground"
              placeholder="Buscar máquinas, músculos o ejercicios..."
              placeholderTextColor="#9ca3af"
              value={busqueda}
              onChangeText={setBusqueda}
              returnKeyType="search"
            />
            {busqueda.length > 0 && (
              <TouchableOpacity
                onPress={() => setBusqueda("")}
                accessibilityLabel="Borrar búsqueda"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={palette.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Grupo muscular
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ChipFiltro
              texto="Todos"
              activo={!categoria}
              onPress={() => setCategoria(undefined)}
            />
            {categorias.map((c) => (
              <ChipFiltro
                key={c}
                texto={c}
                activo={categoria === c}
                onPress={() => setCategoria(categoria === c ? undefined : c)}
              />
            ))}
          </ScrollView>

          <Text className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Tipo
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ChipFiltro
              texto="Todos"
              activo={!tipo}
              onPress={() => setTipo(undefined)}
            />
            {TIPOS.map(([valor, info]) => (
              <ChipFiltro
                key={valor}
                texto={info.etiqueta}
                activo={tipo === valor}
                onPress={() => setTipo(tipo === valor ? undefined : valor)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Contenido */}
        {cargando ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={palette.primary} />
            <Text className="mt-3 text-sm text-text-muted">
              Cargando máquinas...
            </Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center p-6">
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={palette.textMuted}
            />
            <Text className="mt-3 text-center text-sm text-error">{error}</Text>
            <TouchableOpacity
              className="mt-4 rounded-xl bg-primary px-5 py-2.5"
              onPress={() => {
                setCargando(true);
                cargar(true);
              }}
            >
              <Text className="text-sm font-bold text-background">
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtradas}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={() => {
                  setRefrescando(true);
                  cargar(true);
                }}
                colors={[palette.primary]}
                tintColor={palette.primary}
              />
            }
            ListEmptyComponent={
              <View className="mt-10 items-center px-6">
                <Ionicons
                  name="search-outline"
                  size={36}
                  color={palette.textMuted}
                />
                <Text className="mt-2 text-center text-sm text-text-muted">
                  {catalogo.length === 0
                    ? "El catálogo está vacío. Carga las máquinas con el script de seed."
                    : "No hay máquinas con esos filtros."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
