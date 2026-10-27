import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { EntradaAnimada } from "@/components/ui/AnimatedEntrance";
import { palette } from "@/constants/palette";

interface ResumenEntrenamientoProps {
  numeroDia: number;
  enfoque: string;
  ejerciciosRealizados: number;
  ejerciciosTotales: number;
  seriesRealizadas: number;
  duracionSegundos: number;
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-border p-4">
      <Text className="text-xl font-bold text-foreground">{valor}</Text>
      <Text className="mt-1 text-sm text-text-secondary">{etiqueta}</Text>
    </View>
  );
}

/** Pantalla de cierre: confirma el día completado y resume lo realizado. */
export function ResumenEntrenamiento({
  numeroDia,
  enfoque,
  ejerciciosRealizados,
  ejerciciosTotales,
  seriesRealizadas,
  duracionSegundos,
}: ResumenEntrenamientoProps) {
  // Mínimo 1 min para no mostrar "0 min" en sesiones muy cortas.
  const minutos = Math.max(1, Math.round(duracionSegundos / 60));

  return (
    <EntradaAnimada>
      <View className="items-center">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Ionicons name="checkmark" size={44} color={palette.background} />
        </View>
        <Text className="mt-5 text-center text-2xl font-bold text-foreground">
          {ejerciciosRealizados === 0
            ? "Sesión sin ejercicios completados"
            : ejerciciosRealizados < ejerciciosTotales
              ? `Día ${numeroDia}: sesión parcial`
              : `¡Día ${numeroDia} completado!`}
        </Text>
        <Text className="mt-1 text-center text-sm text-text-secondary">
          {enfoque}
        </Text>

        <View className="mt-8 w-full flex-row gap-3">
          <Dato
            valor={`${ejerciciosRealizados}/${ejerciciosTotales}`}
            etiqueta="Ejercicios"
          />
          <Dato valor={String(seriesRealizadas)} etiqueta="Series" />
          <Dato valor={`${minutos} min`} etiqueta="Duración" />
        </View>
      </View>
    </EntradaAnimada>
  );
}
