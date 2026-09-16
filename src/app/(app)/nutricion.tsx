import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { NutritionController } from "@/controllers/NutritionController";
import type { BmiCategory } from "@/utils/imcCalculator";

const CATEGORY_STYLES: Record<BmiCategory, { bar: string; text: string }> = {
  BAJO: { bar: "bg-secondary", text: "text-secondary" },
  NORMALIDAD: { bar: "bg-primary", text: "text-primary" },
  SOBREPESO: { bar: "bg-accent", text: "text-accent" },
  OBESIDAD: { bar: "bg-error", text: "text-error" },
};

export default function NutricionScreen() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);
  const [category, setCategory] = useState<BmiCategory | null>(null);

  const handleCalculate = async () => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!(weightNum > 0) || !(heightNum > 0)) return;

    const resultado = await NutritionController.calcularYGuardarIMC(
      weightNum,
      heightNum
    );
    setBmi(resultado.bmi);
    setCategory(resultado.category);
  };

  const resetCalculator = () => {
    setWeight("");
    setHeight("");
    setBmi(null);
    setCategory(null);
  };

  return (
    <View className="flex-1 items-center bg-background p-5 pt-10">
      <Text className="mb-8 text-2xl font-bold text-foreground">
        Calculadora IMC
      </Text>

      <View className="mb-5 w-full">
        <Text className="mb-1.5 text-base text-text-secondary">
          Peso (kg)
        </Text>
        <TextInput
          className="h-[50px] w-full rounded-lg border border-border bg-primary-light/20 text-center text-lg text-foreground"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          placeholder="Ejemplo: 70"
          placeholderTextColor="#6b7280"
        />
      </View>

      <View className="mb-5 w-full">
        <Text className="mb-1.5 text-base text-text-secondary">
          Altura (cm)
        </Text>
        <TextInput
          className="h-[50px] w-full rounded-lg border border-border bg-primary-light/20 text-center text-lg text-foreground"
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
          placeholder="Ejemplo: 170"
          placeholderTextColor="#6b7280"
        />
      </View>

      <View className="my-7 w-full flex-row justify-between">
        <TouchableOpacity
          className="w-[48%] rounded-2xl bg-text-muted p-4"
          onPress={resetCalculator}
        >
          <Text className="text-center text-base font-bold text-background">
            Reiniciar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-[48%] rounded-2xl bg-primary p-4"
          onPress={handleCalculate}
        >
          <Text className="text-center text-base font-bold text-background">
            Calcular
          </Text>
        </TouchableOpacity>
      </View>

      {bmi !== null && category !== null && (
        <>
          <Text className="mt-5 text-xl font-bold text-foreground">
            Tu IMC es:
          </Text>
          <Text className="my-5 text-5xl font-bold text-foreground">
            {bmi}
          </Text>
          <Text
            className={`mb-2.5 text-xl font-bold ${CATEGORY_STYLES[category].text}`}
          >
            Categoría: {category}
          </Text>

          <View className="mt-5 w-full">
            <View className="h-5 flex-row overflow-hidden rounded-full">
              <View className="flex-1 bg-secondary" />
              <View className="flex-1 bg-primary" />
              <View className="flex-1 bg-accent" />
              <View className="flex-1 bg-error" />
            </View>

            <View className="mt-2.5 flex-row justify-between">
              <Text className="flex-1 text-center text-[11px] text-text-muted">
                BAJO
              </Text>
              <Text className="flex-1 text-center text-[11px] text-text-muted">
                NORMALIDAD
              </Text>
              <Text className="flex-1 text-center text-[11px] text-text-muted">
                SOBREPESO
              </Text>
              <Text className="flex-1 text-center text-[11px] text-text-muted">
                OBESIDAD
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
