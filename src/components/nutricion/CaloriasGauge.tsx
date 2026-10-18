import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { palette } from "@/constants/palette";
import type {
  ResultadoMetas,
  ResumenNutricionalDiario,
} from "@/controllers/NutritionController";

interface CaloriasGaugeProps {
  resumen: ResumenNutricionalDiario;
  /** Cómo se obtuvo la meta; si falta, se asume la meta por defecto. */
  origenMeta?: Pick<ResultadoMetas, "personalizada" | "faltantes" | "detalle">;
  onCompletarPerfil?: () => void;
}

const NOMBRE_DATO: Record<ResultadoMetas["faltantes"][number], string> = {
  peso: "peso",
  altura: "altura",
  edad: "edad",
};

export function CaloriasGauge({
  resumen,
  origenMeta,
  onCompletarPerfil,
}: CaloriasGaugeProps) {
  const size = 110;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference * (1 - Math.min(1, resumen.porcentajeCalorias));

  return (
    <View className="mb-4 rounded-3xl border border-border/50 bg-white p-5 shadow-sm">
      {/* Encabezado de la tarjeta */}
      <View className="mb-4 flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/20">
          <Ionicons name="flame" size={18} color={palette.accentStrong} />
        </View>
        <Text className="text-base font-bold text-foreground">
          Calorías del día
        </Text>
      </View>

      {/* Indicador circular y meta */}
      <View className="flex-row items-center justify-between pb-4">
        {/* Gráfico circular */}
        <View style={{ width: size, height: size }} className="relative">
          <Svg width={size} height={size}>
            {/* Pista de fondo */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progreso activo */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={palette.primary}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-2xl font-extrabold text-foreground">
              {resumen.caloriasConsumidas}
            </Text>
            <Text className="text-[11px] font-semibold text-text-muted">
              kcal
            </Text>
          </View>
        </View>

        {/* Información de calorías restantes */}
        <View className="flex-1 pl-6">
          <Text className="text-xl font-bold text-foreground">
            {resumen.caloriasRestantes} kcal restantes
          </Text>
          <Text className="mt-1 text-xs text-text-secondary">
            Meta: {resumen.metaCalorias} kcal/día
          </Text>
          {origenMeta?.personalizada ? (
            <View className="mt-2 self-start rounded-full bg-primary/10 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-primary">
                PERSONALIZADA
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onCompletarPerfil}
              disabled={!onCompletarPerfil}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Completar perfil para personalizar la meta"
              className="mt-2 self-start rounded-full bg-secondary/30 px-2.5 py-1"
            >
              <Text className="text-[10px] font-bold text-accent-strong">
                META GENÉRICA · COMPLETA TU{" "}
                {(origenMeta?.faltantes ?? ["peso", "altura", "edad"])
                  .map((d) => NOMBRE_DATO[d].toUpperCase())
                  .join(", ")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {origenMeta?.personalizada && origenMeta.detalle ? (
        <Text className="-mt-1 mb-3 text-[10px] leading-4 text-text-muted">
          TMB {origenMeta.detalle.tmb} kcal × actividad{" "}
          {origenMeta.detalle.factorActividad}
          {origenMeta.detalle.ajusteObjetivo !== 0
            ? ` ${origenMeta.detalle.ajusteObjetivo > 0 ? "+" : "−"} ${Math.abs(origenMeta.detalle.ajusteObjetivo)} por objetivo`
            : ""}
          . Estimación referencial (Mifflin-St Jeor); no reemplaza a un
          nutricionista.
        </Text>
      ) : null}

      {/* Barras de macronutrientes */}
      <View className="gap-3 border-t border-border/30 pt-4">
        {/* Proteínas */}
        <View>
          <View className="mb-1 flex-row items-center justify-between text-xs">
            <Text className="text-[11px] font-bold tracking-wider text-text-secondary">
              PROTEÍNAS
            </Text>
            <Text className="text-xs font-semibold text-text-muted">
              <Text className="font-bold text-foreground">
                {resumen.proteinasConsumidas}g
              </Text>{" "}
              / Meta: {resumen.metaProteinas}g
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.round(resumen.porcentajeProteinas * 100)}%`,
                backgroundColor: palette.accent,
              }}
            />
          </View>
        </View>

        {/* Carbohidratos */}
        <View>
          <View className="mb-1 flex-row items-center justify-between text-xs">
            <Text className="text-[11px] font-bold tracking-wider text-text-secondary">
              CARBOHIDRATOS
            </Text>
            <Text className="text-xs font-semibold text-text-muted">
              <Text className="font-bold text-foreground">
                {resumen.carbohidratosConsumidos}g
              </Text>{" "}
              / Meta: {resumen.metaCarbohidratos}g
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.round(resumen.porcentajeCarbohidratos * 100)}%`,
                backgroundColor: palette.primary,
              }}
            />
          </View>
        </View>

        {/* Grasas */}
        <View>
          <View className="mb-1 flex-row items-center justify-between text-xs">
            <Text className="text-[11px] font-bold tracking-wider text-text-secondary">
              GRASAS
            </Text>
            <Text className="text-xs font-semibold text-text-muted">
              <Text className="font-bold text-foreground">
                {resumen.grasasConsumidas}g
              </Text>{" "}
              / Meta: {resumen.metaGrasas}g
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.round(resumen.porcentajeGrasas * 100)}%`,
                backgroundColor: palette.accentStrong,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
