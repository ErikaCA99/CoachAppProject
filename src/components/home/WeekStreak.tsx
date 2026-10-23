import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import type { DiaSemanaSeguimiento } from "@/utils/workoutStats";

interface RachaSemanalProps {
  dias: DiaSemanaSeguimiento[];
  rachaActual: number;
  completadosSemana: number;
  /** Meta de la rutina activa (días por semana). */
  diasPorSemana: number;
}

const NOMBRES_DIA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/**
 * Resumen de la semana para el Inicio: los 7 días con su estado (hecho, hoy,
 * pendiente), la racha actual y cuántos días lleva respecto a la meta de la
 * rutina. Reemplaza las tarjetas de números sueltos.
 */
export function RachaSemanal({
  dias,
  rachaActual,
  completadosSemana,
  diasPorSemana,
}: RachaSemanalProps) {
  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">Esta semana</Text>
        <View className="h-7 flex-row items-center gap-1 rounded-full bg-primary-light/30 px-3">
          <Ionicons name="flame" size={14} color={palette.accentStrong} />
          <Text className="text-sm font-bold text-foreground">
            Racha: {rachaActual} {rachaActual === 1 ? "día" : "días"}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between">
        {dias.map((dia, i) => {
          const estado = dia.completado
            ? "completado"
            : dia.esHoy
              ? "hoy"
              : dia.esFuturo
                ? "pendiente"
                : "sin entrenar";
          return (
            <View
              key={dia.fecha}
              accessibilityLabel={`${NOMBRES_DIA[i]}, ${estado}`}
              className={`h-11 w-11 items-center justify-center rounded-full ${
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
                  size={20}
                  color={palette.background}
                />
              ) : (
                <Text
                  className={`text-sm font-bold ${
                    dia.esHoy ? "text-primary" : "text-text-secondary"
                  }`}
                >
                  {dia.etiqueta}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <Text className="mt-2 text-sm text-text-secondary">
        {completadosSemana} de {diasPorSemana} días completados
      </Text>
    </View>
  );
}
