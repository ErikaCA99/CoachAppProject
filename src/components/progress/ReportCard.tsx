import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";

import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import {
  PERIODOS_REPORTE,
  ReportesController,
  type PeriodoReporte,
} from "@/controllers/ReportsController";
import { toast } from "@/utils/toast";

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
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar el reporte. Intenta nuevamente.",
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <View className="mb-6 rounded-3xl border border-border/50 bg-background p-4 shadow-sm">
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
          <Text className="text-sm text-text-muted">
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
              className={`min-h-11 flex-1 items-center justify-center rounded-full border ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border/60 bg-background"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
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
        accessibilityState={{ disabled: generando }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Generar reporte en PDF"
        className="h-11 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
      >
        {generando ? (
          <IndicadorCarga decorativo color={palette.background} />
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
