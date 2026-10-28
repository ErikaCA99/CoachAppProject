import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

import { RutinaActivaResumen } from "@/components/progress/ActiveRoutineSummary";
import { SeguimientoSemanal } from "@/components/progress/WeeklyTracking";
import { TarjetaReporte } from "@/components/progress/ReportCard";
import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorCarga } from "@/components/ui/LoadError";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { PantallaBase } from "@/components/ui/ScreenBase";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TarjetaDato } from "@/components/ui/StatTile";
import { CampoFormulario } from "@/components/ui/FormField";
import { Text, type TextInputRef } from "@/components/ui/Typography";
import { conOpacidad, palette } from "@/constants/palette";
import { ProgresoController } from "@/controllers/ProgressController";
import { useProgresoScreen } from "@/hooks/useProgressScreen";
import { useAuthStore } from "@/store/auth.store";
import type { ResultadoAccion } from "@/types/actionResult";
import { ETIQUETAS_IMC, type BmiCategory } from "@/utils/bmiCalculator";
import { toast } from "@/utils/toast";

type VistaProgreso = "cuerpo" | "entrenos";

/** Color del trazo del gráfico: `palette.primary` (#1a8062) con opacidad. */
const trazoGrafico = (opacidad = 1) => conOpacidad(palette.primary, opacidad);

/** Color de marca para cada categoría de IMC (el verde "normal" es la única variante positiva). */
function colorCategoriaIMC(categoria: BmiCategory): string {
  // `accent` (#f29580) no alcanza 4.5:1 sobre blanco: toda categoría fuera de
  // lo normal usa `accent-strong`; el nombre de la categoría acompaña al color.
  return categoria === "NORMALIDAD" ? "text-primary" : "text-accent-strong";
}

export default function ProgressScreen() {
  const router = useRouter();
  const pesoInputRef = useRef<TextInputRef>(null);
  const { width: anchoPantalla } = useWindowDimensions();
  const [vista, setVista] = useState<VistaProgreso>("cuerpo");
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
    registrar,
    eliminar,
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
        <IndicadorCarga size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <PantallaBase
      encabezado={
        <AppHeader
          title="Progreso"
          subtitle="Tu cuerpo y tus entrenos"
          onProfilePress={() => router.push("/(app)/profile")}
        />
      }
    >
      <View className="mb-6">
        <SegmentedControl
          options={[
            { value: "cuerpo", label: "Cuerpo" },
            { value: "entrenos", label: "Entrenos" },
          ]}
          value={vista}
          onChange={setVista}
        />
      </View>

      {vista === "cuerpo" ? (
        <>
          <View className="mb-6 flex-row gap-3">
            <TarjetaDato
              valor={ultimoRegistro ? `${ultimoRegistro.peso} kg` : "—"}
              etiqueta="Peso actual"
            />
            <TarjetaDato
              valor={
                diferenciaPeso === null
                  ? "—"
                  : `${diferenciaPeso > 0 ? "+" : ""}${diferenciaPeso} kg`
              }
              etiqueta="Cambio total"
              colorValor={
                diferenciaPeso === null
                  ? "text-foreground"
                  : diferenciaPeso <= 0
                    ? "text-primary"
                    : "text-accent-strong"
              }
            />
            <TarjetaDato
              valor={String(ultimoRegistro?.imc ?? "—")}
              etiqueta={categoriaIMC ? ETIQUETAS_IMC[categoriaIMC] : "IMC"}
              colorEtiqueta={
                categoriaIMC
                  ? colorCategoriaIMC(categoriaIMC)
                  : "text-text-secondary"
              }
              etiquetaDestacada
            />
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
                    width={anchoPantalla - 40 - 32 - 2}
                    height={180}
                    fromZero={false}
                    chartConfig={{
                      backgroundColor: palette.background,
                      backgroundGradientFrom: palette.background,
                      backgroundGradientTo: palette.background,
                      decimalPlaces: 1,
                      color: trazoGrafico,
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
                <CampoFormulario
                  inputRef={pesoInputRef}
                  etiqueta="Peso (kg)"
                  keyboardType="numeric"
                  value={peso}
                  onChangeText={setPeso}
                  placeholder="70.5"
                />
              </View>
              <View className="flex-1">
                <CampoFormulario
                  etiqueta="Altura (cm)"
                  keyboardType="numeric"
                  value={altura}
                  onChangeText={setAltura}
                  placeholder="170"
                />
              </View>
            </View>
            <BotonPrimario
              titulo={guardando ? "Guardando..." : "Registrar"}
              onPress={handleRegistrar}
              cargando={guardando}
            />
          </View>

          <Text className="mb-3 text-base font-bold text-foreground">
            Historial de peso
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
                    className="h-11 w-11 items-center justify-center"
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
            <TarjetaDato
              valor={`${resumenEntrenos.rachaActual} ${
                resumenEntrenos.rachaActual === 1 ? "día" : "días"
              }`}
              etiqueta="Racha actual"
            />
            <TarjetaDato
              valor={`${resumenEntrenos.completadosSemana}/${resumenEntrenos.totalSemana}`}
              etiqueta="Esta semana"
            />
            <TarjetaDato
              valor={String(resumenEntrenos.totalEntrenos)}
              etiqueta="Entrenos recientes"
            />
          </View>

          <View className="mb-6">
            <SeguimientoSemanal
              dias={resumenEntrenos.dias}
              completadosSemana={resumenEntrenos.completadosSemana}
              totalSemana={resumenEntrenos.totalSemana}
            />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/routines")}
            className="min-h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-primary px-4"
          >
            <Ionicons name="list-outline" size={18} color={palette.primary} />
            <Text className="text-sm font-bold text-primary">
              Ver mi rutina por días
            </Text>
          </TouchableOpacity>
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

      {/* Reporte personalizado en PDF (OE7): acción al final, no tapa los gráficos */}
      {uid ? (
        <View className="mt-6">
          <TarjetaReporte usuarioId={uid} />
        </View>
      ) : null}
    </PantallaBase>
  );
}
