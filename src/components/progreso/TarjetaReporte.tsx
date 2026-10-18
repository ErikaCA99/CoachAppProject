import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import {
  PERIODOS_REPORTE,
  ReportesController,
  type PeriodoReporte,
} from "@/controllers/ReportesController";

interface TarjetaReporteProps {
  usuarioId: string;
}

/** Genera el reporte personalizado de progreso en PDF (OE7). */
export function TarjetaReporte({ usuarioId }: TarjetaReporteProps) {
  const [periodo, setPeriodo] = useState<PeriodoReporte>(30);
  const [generando, setGenerando] = useState(false);

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      await ReportesController.generarYCompartir(usuarioId, periodo);
    } catch (error) {
      Alert.alert(
        "No se pudo generar el reporte",
        error instanceof Error ? error.message : "Intenta nuevamente.",
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <View className="mb-6 rounded-3xl border border-border/50 bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/15">
          <Ionicons
            name="document-text-outline"
            size={17}
            color={palette.primary}
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            Reporte de progreso
          </Text>
          <Text className="text-[11px] text-text-muted">
            Peso, IMC, entrenamientos y alimentación en PDF
          </Text>
        </View>
      </View>

      <View className="mb-3 flex-row gap-2">
        {PERIODOS_REPORTE.map((p) => {
          const activo = p.valor === periodo;
          return (
            <TouchableOpacity
              key={p.etiqueta}
              onPress={() => setPeriodo(p.valor)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              className={`flex-1 items-center rounded-full border py-1.5 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border/60 bg-white"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activo ? "text-background" : "text-foreground"
                }`}
              >
                {p.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={handleGenerar}
        disabled={generando}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Generar reporte en PDF"
        className="h-11 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
      >
        {generando ? (
          <ActivityIndicator color={palette.background} />
        ) : (
          <>
            <Ionicons
              name="download-outline"
              size={18}
              color={palette.background}
            />
            <Text className="text-sm font-bold text-background">
              Generar PDF
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
