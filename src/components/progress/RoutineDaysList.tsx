import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { MiniaturaEjercicio } from "@/components/routines/ExerciseThumbnail";
import { palette } from "@/constants/palette";
import type { DiaRutina, EjercicioRutina } from "@/models/entities/Routine";

interface ListaDiasRutinaProps {
  planSemanal: DiaRutina[];
  /** Número de día (1..7) marcado como completado hoy, o `null` si ninguno. */
  diaCompletadoHoy: number | null;
  onToggleDia: (numeroDia: number) => void;
  onIrAMaquina: (ejercicio: EjercicioRutina) => void;
  /** Abre el entrenamiento guiado de ese día. */
  onEmpezarDia: (numeroDia: number) => void;
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
  onEmpezarDia,
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
                    className="mt-0.5 text-sm text-text-secondary"
                    numberOfLines={1}
                  >
                    {dia.enfoque}
                  </Text>
                </View>
                <Text className="mr-2 text-sm text-text-secondary">
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
                    <MiniaturaEjercicio
                      ejercicioId={ejercicio.maquinaId}
                      imagenUrl={ejercicio.imagenUrl}
                      nombre={ejercicio.nombre}
                      tamano={40}
                    />
                    <View className="ml-2.5 flex-1">
                      <Text
                        className="text-sm font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {ejercicio.nombre}
                      </Text>
                      <Text className="mt-0.5 text-base font-bold text-foreground">
                        {ejercicio.series} series × {ejercicio.repeticiones}{" "}
                        reps
                      </Text>
                      <Text className="text-sm text-text-secondary">
                        Descanso {ejercicio.descansoSegundos} s
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {dia.ejercicios.length === 0 ? (
                  <Text className="text-sm text-text-muted">
                    Sin ejercicios en este día.
                  </Text>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    onPress={() => onEmpezarDia(dia.dia)}
                    className="mt-1 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary"
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color={palette.background}
                    />
                    <Text className="text-sm font-bold text-background">
                      Entrenar este día
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
