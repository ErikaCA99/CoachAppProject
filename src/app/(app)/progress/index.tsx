import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

import { ListaDiasRutina } from "@/components/progress/RoutineDaysList";
import { RutinaActivaResumen } from "@/components/progress/ActiveRoutineSummary";
import { SeguimientoSemanal } from "@/components/progress/WeeklyTracking";
import { TarjetaReporte } from "@/components/progress/ReportCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorCarga } from "@/components/ui/LoadError";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text, TextInput, type TextInputRef } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { ProgresoController } from "@/controllers/ProgressController";
import { useIrAMaquina } from "@/hooks/useGoToMachine";
import { useProgresoScreen } from "@/hooks/useProgressScreen";
import { useAuthStore } from "@/store/auth.store";
import type { ResultadoAccion } from "@/types/actionResult";
import { ETIQUETAS_IMC, type BmiCategory } from "@/utils/bmiCalculator";
import { toast } from "@/utils/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: ANCHO_PANTALLA } = Dimensions.get("window");

type VistaProgreso = "peso" | "rutinas";

/** Color de marca para cada categoría de IMC (el verde "normal" es la única variante positiva). */
function colorCategoriaIMC(categoria: BmiCategory): string {
  if (categoria === "NORMALIDAD") return "text-primary";
  if (categoria === "OBESIDAD") return "text-accent-strong";
  return "text-accent";
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pesoInputRef = useRef<TextInputRef>(null);
  const irAMaquina = useIrAMaquina();
  const [vista, setVista] = useState<VistaProgreso>("peso");
  const uid = useAuthStore((s) => s.user?.uid);

  const {
    cargando,
    error,
    reintentar,
    registros,
    ultimoRegistro,
    categoriaIMC,
    diferenciaPeso,
    metricaGrafico,
    setMetricaGrafico,
    datosGrafico,
    diferenciaMetrica,
    estadisticasGrafico,
    peso,
    setPeso,
    altura,
    setAltura,
    guardando,
    rutinaActiva,
    resumenEntrenos,
    diaCompletadoHoy,
    marcandoEntreno,
    registrar,
    eliminar,
    alternarDia,
  } = useProgresoScreen();

  /** Muestra el aviso de una acción que falló (la lógica vive en el hook). */
  const avisarSiFallo = (resultado: ResultadoAccion) => {
    toast.desdeResultado(resultado);
  };

  const handleRegistrar = async () => avisarSiFallo(await registrar());

  const handleEliminar = (registroId: string) => {
    Alert.alert("Eliminar registro", "¿Seguro que quieres eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => avisarSiFallo(await eliminar(registroId)),
      },
    ]);
  };

  const handleToggleDia = async (numeroDia: number) =>
    avisarSiFallo(await alternarDia(numeroDia));

  if (error) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorCarga mensaje={error} onReintentar={reintentar} />
      </View>
    );
  }

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Encabezado fijo: protege la barra de estado y mantiene accesible la navegación */}
      <View className="px-5 pt-3">
        <AppHeader
          title="Progreso"
          subtitle="Sigue tu avance y rutinas"
          onProfilePress={() => router.push("/(app)/profile")}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 90,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reporte personalizado en PDF (OE7) */}
        {uid ? <TarjetaReporte usuarioId={uid} /> : null}

        <View className="mb-6">
          <SegmentedControl
            options={[
              { value: "peso", label: "Peso" },
              { value: "rutinas", label: "Rutinas" },
            ]}
            value={vista}
            onChange={setVista}
          />
        </View>

        {vista === "peso" ? (
          <>
            <View className="mb-6 flex-row gap-3">
              <View className="flex-1 items-center rounded-2xl border border-border p-4">
                <Text className="text-xl font-bold text-foreground">
                  {ultimoRegistro ? `${ultimoRegistro.peso} kg` : "—"}
                </Text>
                <Text className="mt-1 text-sm text-text-secondary">
                  Peso actual
                </Text>
              </View>
              <View className="flex-1 items-center rounded-2xl border border-border p-4">
                <Text
                  className={`text-xl font-bold ${
                    diferenciaPeso === null
                      ? "text-foreground"
                      : diferenciaPeso <= 0
                        ? "text-primary"
                        : "text-accent-strong"
                  }`}
                >
                  {diferenciaPeso === null
                    ? "—"
                    : `${diferenciaPeso > 0 ? "+" : ""}${diferenciaPeso} kg`}
                </Text>
                <Text className="mt-1 text-sm text-text-secondary">
                  Cambio total
                </Text>
              </View>
              <View className="flex-1 items-center rounded-2xl border border-border p-4">
                <Text className="text-xl font-bold text-foreground">
                  {ultimoRegistro?.imc ?? "—"}
                </Text>
                <Text
                  className={`mt-1 text-sm font-semibold ${
                    categoriaIMC
                      ? colorCategoriaIMC(categoriaIMC)
                      : "text-text-secondary"
                  }`}
                >
                  {categoriaIMC ? ETIQUETAS_IMC[categoriaIMC] : "IMC"}
                </Text>
              </View>
            </View>

            <View className="mb-6 rounded-2xl border border-border bg-background p-4">
              <View className="mb-1 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons
                    name="analytics-outline"
                    size={16}
                    color={palette.primary}
                  />
                  <Text className="text-sm font-bold text-foreground">
                    Evolución corporal
                  </Text>
                </View>
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: "peso", label: "Peso" },
                    { value: "imc", label: "IMC" },
                  ]}
                  value={metricaGrafico}
                  onChange={setMetricaGrafico}
                />
              </View>

              {diferenciaMetrica !== null && (
                <View className="mb-2 flex-row items-center gap-1">
                  <Ionicons
                    name={diferenciaMetrica <= 0 ? "arrow-down" : "arrow-up"}
                    size={13}
                    color={
                      diferenciaMetrica <= 0
                        ? palette.primary
                        : palette.accentStrong
                    }
                  />
                  <Text
                    className={`text-sm font-semibold ${
                      diferenciaMetrica <= 0
                        ? "text-primary"
                        : "text-accent-strong"
                    }`}
                  >
                    {Math.abs(diferenciaMetrica)}
                    {metricaGrafico === "peso" ? " kg" : ""} desde el inicio
                  </Text>
                </View>
              )}

              {datosGrafico.datasets[0].data.length >= 2 ? (
                <>
                  <View className="items-center overflow-hidden rounded-xl">
                    <LineChart
                      data={datosGrafico}
                      width={ANCHO_PANTALLA - 40 - 32 - 2}
                      height={180}
                      fromZero={false}
                      chartConfig={{
                        backgroundColor: palette.background,
                        backgroundGradientFrom: palette.background,
                        backgroundGradientTo: palette.background,
                        decimalPlaces: 1,
                        color: (opacity = 1) =>
                          `rgba(50, 166, 133, ${opacity})`,
                        labelColor: () => palette.textMuted,
                        fillShadowGradient: palette.primary,
                        fillShadowGradientOpacity: 0.15,
                        propsForDots: {
                          r: "4",
                          strokeWidth: "2",
                          stroke: palette.primary,
                        },
                        propsForBackgroundLines: { stroke: palette.border },
                      }}
                      bezier
                      style={{ borderRadius: 16, paddingRight: 24 }}
                    />
                  </View>

                  {estadisticasGrafico && (
                    <View className="mt-2 flex-row justify-between border-t border-border pt-3">
                      <View className="items-center">
                        <Text className="text-sm font-bold text-foreground">
                          {estadisticasGrafico.minimo}
                          {metricaGrafico === "peso" ? " kg" : ""}
                        </Text>
                        <Text className="mt-0.5 text-sm text-text-secondary">
                          Mínimo
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-sm font-bold text-foreground">
                          {estadisticasGrafico.promedio}
                          {metricaGrafico === "peso" ? " kg" : ""}
                        </Text>
                        <Text className="mt-0.5 text-sm text-text-secondary">
                          Promedio
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-sm font-bold text-foreground">
                          {estadisticasGrafico.maximo}
                          {metricaGrafico === "peso" ? " kg" : ""}
                        </Text>
                        <Text className="mt-0.5 text-sm text-text-secondary">
                          Máximo
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <Text className="py-4 text-center text-sm text-text-secondary">
                  {metricaGrafico === "imc"
                    ? "Registra tu altura para ver la evolución de tu IMC."
                    : "Registra al menos 2 pesos para ver tu evolución."}
                </Text>
              )}
            </View>

            <View className="mb-6 rounded-2xl border border-border bg-background p-4">
              <View className="mb-3 flex-row items-center gap-1.5">
                <Ionicons
                  name="clipboard-outline"
                  size={16}
                  color={palette.primary}
                />
                <Text className="text-sm font-bold text-foreground">
                  Registrar peso
                </Text>
              </View>
              <View className="mb-3 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-sm text-text-muted">
                    Peso (kg)
                  </Text>
                  <TextInput
                    ref={pesoInputRef}
                    className="rounded-xl border border-border bg-primary-light/20 p-3 text-base text-foreground"
                    keyboardType="numeric"
                    value={peso}
                    onChangeText={setPeso}
                    placeholder="70.5"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-sm text-text-muted">
                    Altura (cm)
                  </Text>
                  <TextInput
                    className="rounded-xl border border-border bg-primary-light/20 p-3 text-base text-foreground"
                    keyboardType="numeric"
                    value={altura}
                    onChangeText={setAltura}
                    placeholder="170"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                className="items-center rounded-2xl bg-primary p-4"
                activeOpacity={0.85}
                onPress={handleRegistrar}
                disabled={guardando}
                style={guardando ? { opacity: 0.6 } : undefined}
              >
                <Text className="text-sm font-bold text-background">
                  {guardando ? "Guardando..." : "Registrar"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="mb-3 text-base font-bold text-foreground">
              Historial (últimos 500 registros)
            </Text>
            {registros.length === 0 ? (
              <EmptyState
                icon="analytics-outline"
                title="Aún no tienes registros"
                description="Agrega tu primer registro de peso para empezar a ver tu evolución."
                actionButton={{
                  label: "Registrar peso",
                  icon: "add-circle-outline",
                  onPress: () => pesoInputRef.current?.focus(),
                }}
                compact
              />
            ) : (
              [...registros].reverse().map((registro) => {
                const categoria = ProgresoController.categoriaIMC(registro.imc);
                return (
                  <View
                    key={registro.id}
                    className="mb-2.5 flex-row items-center justify-between rounded-2xl bg-primary-light/10 p-4"
                  >
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-light/40">
                      <Ionicons
                        name="body-outline"
                        size={18}
                        color={palette.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {registro.peso} kg
                        {registro.imc ? ` · IMC ${registro.imc}` : ""}
                      </Text>
                      <Text className="mt-0.5 text-sm text-text-secondary">
                        {ProgresoController.fechaLegible(registro)}
                        {categoria ? ` · ${ETIQUETAS_IMC[categoria]}` : ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar registro"
                      onPress={() => handleEliminar(registro.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="p-1.5"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={palette.error}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        ) : rutinaActiva ? (
          <>
            <View className="mb-4">
              <RutinaActivaResumen rutina={rutinaActiva} />
            </View>

            <View className="mb-6 flex-row gap-3">
              <View className="flex-1 items-center rounded-2xl border border-border p-4">
                <Text className="text-xl font-bold text-foreground">
                  {resumenEntrenos.rachaActual}{" "}
                  {resumenEntrenos.rachaActual === 1 ? "día" : "días"}
                </Text>
                <Text className="mt-1 text-sm text-text-secondary">
                  Racha actual
                </Text>
              </View>
              <View className="flex-1 items-center rounded-2xl border border-border p-4">
                <Text className="text-xl font-bold text-foreground">
                  {resumenEntrenos.completadosSemana}/
                  {resumenEntrenos.totalSemana}
                </Text>
                <Text className="mt-1 text-sm text-text-secondary">
                  Esta semana
                </Text>
              </View>
              <View className="flex-1 items-center rounded-2xl border border-border p-4">
                <Text className="text-xl font-bold text-foreground">
                  {resumenEntrenos.totalEntrenos}
                </Text>
                <Text className="mt-1 text-sm text-text-secondary">
                  Entrenos recientes (máx. 500)
                </Text>
              </View>
            </View>

            <View className="mb-6">
              <SeguimientoSemanal
                dias={resumenEntrenos.dias}
                completadosSemana={resumenEntrenos.completadosSemana}
                totalSemana={resumenEntrenos.totalSemana}
              />
            </View>

            <Text className="mb-3 text-base font-bold text-foreground">
              Mi Rutina
            </Text>
            <ListaDiasRutina
              planSemanal={rutinaActiva.planSemanal}
              diaCompletadoHoy={diaCompletadoHoy}
              onToggleDia={handleToggleDia}
              onIrAMaquina={irAMaquina}
              onEmpezarDia={(numeroDia) =>
                router.push({
                  pathname: "/(app)/train",
                  params: { dia: String(numeroDia) },
                })
              }
              guardando={marcandoEntreno}
            />
          </>
        ) : (
          <EmptyState
            icon="barbell-outline"
            title="Aún no tienes una rutina activa"
            description="Genera una rutina con IA o crea la tuya para empezar a seguir tu progreso de entrenamiento."
            actionButton={{
              label: "Generar rutina",
              icon: "sparkles-outline",
              onPress: () => router.push("/(app)/routines/generate"),
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}
