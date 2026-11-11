import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { ChipFiltro } from "@/features/machines/view/FilterChip";
import { HojaFiltros } from "@/features/machines/view/FilterSheet";
import { TarjetaMaquina } from "@/features/machines/view/MachineCard";
import { IndicadorCarga } from "@/shared/ui/LoadingIndicator";
import { AppHeader } from "@/shared/ui/AppHeader";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PantallaBase } from "@/shared/ui/ScreenBase";
import { CampoBusqueda } from "@/shared/ui/SearchField";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import { MaquinasController } from "@/features/machines/controller/MachinesController";
import {
  TIPOS_MAQUINA,
  type Maquina,
  type TipoMaquina,
} from "@/features/machines";

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
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
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
    (id: string) =>
      router.push({ pathname: "/(app)/machines/[id]", params: { id } }),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Maquina }) => (
      <TarjetaMaquina maquina={item} onPress={() => irADetalle(item.id)} />
    ),
    [irADetalle],
  );

  return (
    <>
      <PantallaBase
        conScroll={false}
        encabezado={
          <View className="pb-3">
            <AppHeader
              title="Guía de máquinas"
              subtitle={
                hayFiltros
                  ? `${filtradas.length} de ${catalogo.length} máquinas`
                  : `${catalogo.length} máquinas`
              }
              secondaryAction={{
                icon: "scan",
                label: "Escanear una máquina",
                onPress: () => router.push("/(app)/machines/scanner"),
              }}
              onProfilePress={() => router.push("/(app)/profile")}
            />

            <View className="mt-4">
              <CampoBusqueda
                valor={busqueda}
                onCambiar={setBusqueda}
                placeholder="Buscar máquina o músculo"
                etiqueta="Buscar máquina"
              />
            </View>

            <View className="mt-3 flex-row items-center">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-1"
                accessibilityLabel="Grupo muscular"
              >
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
                    onPress={() =>
                      setCategoria(categoria === c ? undefined : c)
                    }
                  />
                ))}
              </ScrollView>
              <Pressable
                onPress={() => setFiltrosAbiertos(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  tipo ? "Filtros, 1 activo" : "Filtros, ninguno activo"
                }
                className="ml-1 min-h-11 flex-row items-center rounded-full border border-primary bg-background px-3.5 active:opacity-70"
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={palette.primary}
                />
                <Text className="ml-1.5 text-sm font-bold text-primary">
                  Filtros
                </Text>
                {tipo ? (
                  <View className="ml-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
                    <Text className="text-xs font-bold text-background">1</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {tipo ? (
              <View className="mt-2 flex-row">
                <Pressable
                  onPress={() => setTipo(undefined)}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar filtro Tipo: ${TIPOS_MAQUINA[tipo].etiqueta}`}
                  className="min-h-11 flex-row items-center rounded-full border border-primary-light pl-4 pr-3 active:opacity-70"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    Tipo: {TIPOS_MAQUINA[tipo].etiqueta}
                  </Text>
                  <Ionicons
                    name="close"
                    size={16}
                    color={palette.textSecondary}
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        }
      >
        {/* Contenido */}
        {cargando ? (
          <View className="flex-1 items-center justify-center">
            <IndicadorCarga decorativo size="large" color={palette.primary} />
            <Text className="mt-3 text-sm text-text-muted">
              Cargando máquinas...
            </Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center p-6">
            <EmptyState
              icon="cloud-offline-outline"
              title="No se pudo cargar el catálogo"
              description={error}
              actionButton={{
                label: "Reintentar",
                icon: "refresh",
                onPress: () => {
                  setCargando(true);
                  cargar(true);
                },
              }}
            />
          </View>
        ) : (
          <FlatList
            data={filtradas}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
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
              <EmptyState
                icon="search-outline"
                title={
                  catalogo.length === 0
                    ? "El catálogo está vacío"
                    : "Sin resultados"
                }
                description={
                  catalogo.length === 0
                    ? "Aún no hay máquinas disponibles. Intenta de nuevo más tarde."
                    : "No hay máquinas con esos filtros. Prueba con otra búsqueda o categoría."
                }
                actionButton={
                  hayFiltros
                    ? {
                        label: "Quitar filtros",
                        icon: "close-circle-outline",
                        onPress: () => {
                          setBusqueda("");
                          setCategoria(undefined);
                          setTipo(undefined);
                        },
                      }
                    : undefined
                }
              />
            }
          />
        )}
      </PantallaBase>

      <HojaFiltros
        visible={filtrosAbiertos}
        tipo={tipo}
        onCambiarTipo={setTipo}
        onCerrar={() => setFiltrosAbiertos(false)}
      />
    </>
  );
}
