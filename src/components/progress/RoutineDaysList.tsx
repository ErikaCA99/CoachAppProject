import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { palette } from "@/constants/palette";
import type { DiaRutina, EjercicioRutina } from "@/models/entities/Routine";

interface ListaDiasRutinaProps {
  planSemanal: DiaRutina[];
  /** Número de día (1..7) marcado como completado hoy, o `null` si ninguno. */
  diaCompletadoHoy: number | null;
  onToggleDia: (numeroDia: number) => void;
  onIrAMaquina: (ejercicio: EjercicioRutina) => void;
  /** Deshabilita los checkboxes mientras se guarda el cambio en Firestore. */
  guardando?: boolean;
}

/**
 * Checklist de los días de la rutina activa: cada fila permite marcar el
 * entrenamiento de hoy (checkbox) y expandir para ver/abrir sus ejercicios.
 */
export function ListaDiasRutina({
  planSemanal,
  diaCompletadoHoy,
  onToggleDia,
  onIrAMaquina,
  guardando = false,
}: ListaDiasRutinaProps) {
  const [diaExpandido, setDiaExpandido] = useState<number | null>(null);

  return (
    <View className="gap-2.5">
      {planSemanal.map((dia) => {
        const completado = diaCompletadoHoy === dia.dia;
        const expandido = diaExpandido === dia.dia;

        return (
          <View
            key={dia.dia}
            className="overflow-hidden rounded-2xl border border-border bg-background"
          >
            <View className="flex-row items-center p-3.5">
              <TouchableOpacity
                onPress={() => onToggleDia(dia.dia)}
                disabled={guardando}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: completado,
                  disabled: guardando,
                }}
                accessibilityLabel={`Marcar Día ${dia.dia} como completado hoy`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="mr-3 h-7 w-7 items-center justify-center rounded-full border-2 border-primary"
                style={
                  completado ? { backgroundColor: palette.primary } : undefined
                }
              >
                {completado ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={palette.background}
                  />
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                className="flex-1 flex-row items-center"
                onPress={() => setDiaExpandido(expandido ? null : dia.dia)}
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-bold text-foreground">
                    Día {dia.dia}
                  </Text>
                  <Text
                    className="mt-0.5 text-xs text-text-secondary"
                    numberOfLines={1}
                  >
                    {dia.enfoque}
                  </Text>
                </View>
                <Text className="mr-2 text-xs text-text-secondary">
                  {dia.ejercicios.length} ejerc.
                </Text>
                <Ionicons
                  name={expandido ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={palette.textMuted}
                />
              </TouchableOpacity>
            </View>

            {expandido && (
              <View className="px-3.5 pb-3.5">
                {dia.ejercicios.map((ejercicio, indice) => (
                  <TouchableOpacity
                    key={`${ejercicio.maquinaId}-${indice}`}
                    activeOpacity={0.75}
                    className="mb-2 flex-row items-center rounded-lg border border-border p-2.5"
                    onPress={() => onIrAMaquina(ejercicio)}
                  >
                    {ejercicio.imagenUrl ? (
                      <Image
                        source={{ uri: ejercicio.imagenUrl }}
                        className="h-10 w-10 rounded-md"
                      />
                    ) : (
                      <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-light/40">
                        <Ionicons
                          name="barbell-outline"
                          size={16}
                          color={palette.primary}
                        />
                      </View>
                    )}
                    <View className="ml-2.5 flex-1">
                      <Text
                        className="text-xs font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {ejercicio.nombre}
                      </Text>
                      <Text className="text-xs text-text-secondary">
                        {ejercicio.series} series × {ejercicio.repeticiones}{" "}
                        reps · {ejercicio.descansoSegundos}s descanso
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {dia.ejercicios.length === 0 && (
                  <Text className="text-xs text-text-muted">
                    Sin ejercicios en este día.
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
