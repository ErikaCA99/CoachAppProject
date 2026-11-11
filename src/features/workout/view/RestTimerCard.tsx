import { View } from "react-native";

import { BarraProgreso } from "@/shared/ui/ProgressBar";
import { Text } from "@/shared/ui/Typography";
import { formatearTemporizador } from "@/features/workout/model/rules/workoutSession";

interface TarjetaDescansoProps {
  /** Segundos que faltan; 0 si no hay un descanso en curso. */
  segundosRestantes: number;
  segundosTotales: number;
  /** Descanso configurado del ejercicio, visible mientras no hay uno en curso. */
  descansoConfigurado: number;
}

/**
 * Espacio fijo del descanso entre series. Siempre ocupa el mismo alto, con o
 * sin cuenta regresiva, para que el resto de la pantalla no salte cuando el
 * descanso empieza o termina. Saltarlo se hace desde el botón principal.
 */
export function TarjetaDescanso({
  segundosRestantes,
  segundosTotales,
  descansoConfigurado,
}: TarjetaDescansoProps) {
  const enDescanso = segundosRestantes > 0;
  const transcurrido = enDescanso
    ? segundosTotales > 0
      ? 1 - segundosRestantes / segundosTotales
      : 1
    : 0;

  return (
    <View className="min-h-[112px] justify-between rounded-2xl border border-border p-4">
      <View>
        <Text className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Descanso
        </Text>
        {enDescanso ? (
          <Text
            className="text-[40px] font-bold leading-[48px] text-foreground"
            style={{ fontVariant: ["tabular-nums"] }}
            accessibilityLabel={`Descanso, ${segundosRestantes} segundos restantes`}
          >
            {formatearTemporizador(segundosRestantes)}
          </Text>
        ) : (
          <Text className="text-xl font-bold leading-[48px] text-text-secondary">
            {descansoConfigurado > 0
              ? `Entre series: ${descansoConfigurado} s`
              : "Sin descanso configurado"}
          </Text>
        )}
      </View>
      <View className="mt-3">
        <BarraProgreso
          valor={transcurrido}
          etiqueta="Tiempo de descanso transcurrido"
        />
      </View>
    </View>
  );
}
