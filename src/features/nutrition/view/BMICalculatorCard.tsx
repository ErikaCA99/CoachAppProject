import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";

import { IndicadorCarga } from "@/shared/ui/LoadingIndicator";
import { ErrorEnLinea } from "@/shared/ui/InlineError";
import { CampoFormulario } from "@/shared/ui/FormField";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import type { ResultadoIMC } from "@/features/nutrition/controller/NutritionController";
import {
  ETIQUETAS_IMC,
  obtenerMensajeIMC,
  type BmiCategory,
} from "@/features/nutrition/model/rules/bmiCalculator";

interface CalculadoraIMCCardProps {
  onCalcular: (pesoKg: number, alturaCm: number) => Promise<ResultadoIMC>;
  calculando?: boolean;
}

const COLOR_CATEGORIA: Record<
  BmiCategory,
  { bg: string; text: string; dot: string }
> = {
  BAJO: {
    bg: "bg-surface/30",
    text: "text-foreground",
    dot: palette.primaryLight,
  },
  NORMALIDAD: {
    bg: "bg-primary/15",
    text: "text-primary",
    dot: palette.primary,
  },
  SOBREPESO: {
    bg: "bg-secondary/30",
    text: "text-accent-strong",
    dot: palette.secondary,
  },
  OBESIDAD: {
    bg: "bg-accent/20",
    text: "text-error",
    dot: palette.accentStrong,
  },
};

export function CalculadoraIMCCard({
  onCalcular,
  calculando = false,
}: CalculadoraIMCCardProps) {
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [resultado, setResultado] = useState<ResultadoIMC | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalcular = async () => {
    const pesoNum = parseFloat(peso.replace(",", "."));
    const alturaNum = parseFloat(altura.replace(",", "."));

    if (isNaN(pesoNum) || pesoNum <= 0) {
      setError("Ingresa un peso válido en kilogramos (ej. 70).");
      return;
    }

    if (isNaN(alturaNum) || alturaNum <= 0) {
      setError("Ingresa una altura válida en centímetros (ej. 175).");
      return;
    }

    setError(null);
    try {
      const res = await onCalcular(pesoNum, alturaNum);
      setResultado(res);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo calcular. Revisa los valores.",
      );
    }
  };

  const handleLimpiar = () => {
    setPeso("");
    setAltura("");
    setResultado(null);
    setError(null);
  };

  return (
    <View className="mb-4 rounded-3xl border border-border/50 bg-background p-5 shadow-sm">
      {/* Encabezado */}
      <View className="mb-4 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/15">
          <Ionicons
            name="speedometer-outline"
            size={18}
            color={palette.primary}
          />
        </View>
        <Text className="text-base font-bold text-foreground">
          Calculadora IMC
        </Text>
      </View>

      {/* Inputs de peso y altura */}
      <View className="mb-4 flex-row gap-3">
        <View className="flex-1">
          <CampoFormulario
            mayusculas
            centrado
            etiqueta="Peso (kg)"
            value={peso}
            onChangeText={(t) => {
              setPeso(t);
              setError(null);
            }}
            placeholder="Ej. 70"
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <CampoFormulario
            mayusculas
            centrado
            etiqueta="Altura (cm)"
            value={altura}
            onChangeText={(t) => {
              setAltura(t);
              setError(null);
            }}
            placeholder="Ej. 175"
            keyboardType="numeric"
          />
        </View>
      </View>

      <ErrorEnLinea mensaje={error} />

      {/* Botón calcular */}
      <TouchableOpacity
        onPress={handleCalcular}
        disabled={calculando}
        accessibilityState={{ disabled: calculando }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Calcular índice de masa corporal"
        className="h-12 items-center justify-center rounded-2xl bg-primary"
      >
        {calculando ? (
          <IndicadorCarga decorativo color={palette.background} />
        ) : (
          <Text className="text-base font-bold text-background">Calcular</Text>
        )}
      </TouchableOpacity>

      {/* Resultado calculado */}
      {resultado ? (
        <View className="mt-4 items-center rounded-2xl border border-border/40 bg-primary-light/15 p-4">
          <View className="mb-1 flex-row items-baseline gap-1.5">
            <Text className="text-3xl font-black text-foreground">
              {resultado.bmi}
            </Text>
            <Text className="text-sm font-semibold text-text-secondary">
              IMC
            </Text>
          </View>

          {/* Badge de categoría */}
          <View
            className={`mt-1 rounded-full px-3 py-1 ${COLOR_CATEGORIA[resultado.category].bg}`}
          >
            <Text
              className={`text-sm font-bold ${COLOR_CATEGORIA[resultado.category].text}`}
            >
              {ETIQUETAS_IMC[resultado.category]}
            </Text>
          </View>

          {/* Mensaje descriptivo */}
          <Text className="mt-2.5 text-center text-sm leading-5 text-text-secondary">
            {obtenerMensajeIMC(resultado.category)}
          </Text>

          <TouchableOpacity
            onPress={handleLimpiar}
            activeOpacity={0.7}
            accessibilityRole="button"
            className="mt-3 min-h-11 justify-center"
          >
            <Text className="text-sm font-semibold text-text-secondary">
              Limpiar campos
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
