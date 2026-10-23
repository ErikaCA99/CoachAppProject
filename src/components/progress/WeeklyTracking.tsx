import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import type { DiaSemanaSeguimiento } from "@/utils/workoutStats";

interface SeguimientoSemanalProps {
  dias: DiaSemanaSeguimiento[];
  completadosSemana: number;
  totalSemana: number;
}

/**
 * Calendario semanal (lunes a domingo) con el estado de cada día:
 * completado, hoy (sin completar aún) o pendiente/futuro. Incluye una
 * barra de progreso con el total de días completados en la semana.
 */
export function SeguimientoSemanal({
  dias,
  completadosSemana,
  totalSemana,
}: SeguimientoSemanalProps) {
  const progreso = totalSemana > 0 ? completadosSemana / totalSemana : 0;

  return (
    <View className="rounded-2xl border border-border bg-background p-4">
      <View className="mb-4 flex-row items-center gap-1.5">
        <Ionicons name="flame" size={16} color={palette.accentStrong} />
        <Text className="text-sm font-bold text-foreground">Esta semana</Text>
      </View>

      <View className="flex-row justify-between">
        {dias.map((dia) => (
          <View key={dia.fecha} className="items-center gap-1.5">
            <Text className="text-sm font-semibold text-text-secondary">
              {dia.etiqueta}
            </Text>
            <View
              className={`h-8 w-8 items-center justify-center rounded-full ${
                dia.completado
                  ? "bg-primary"
                  : dia.esHoy
                    ? "border-2 border-primary bg-background"
                    : "bg-primary-light/25"
              }`}
            >
              {dia.completado ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={palette.background}
                />
              ) : (
                <Text
                  className={`text-sm font-bold ${
                    dia.esFuturo ? "text-text-muted" : "text-foreground"
                  }`}
                >
                  {dia.numeroDia}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-light/25">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.round(progreso * 100)}%` }}
        />
      </View>
      <Text className="mt-2 text-right text-sm text-text-secondary">
        {completadosSemana} de {totalSemana} días completados
      </Text>
    </View>
  );
}
