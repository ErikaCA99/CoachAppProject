import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonPrimario } from "@/components/ui/BotonPrimario";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { palette } from "@/constants/palette";
import { OPCIONES_DIAS_DISPONIBLES } from "@/models/entities/Usuario";
import {
  datosFisicosSchema,
  type DatosFisicosInput,
} from "@/schemas/usuario.schema";
import { useOnboardingStore } from "@/store/onboarding.store";

type Campo = keyof DatosFisicosInput;

interface FormularioTexto {
  edad: string;
  altura: string;
  pesoActual: string;
}

/** Convierte el texto del input a número aceptando coma decimal; vacío → NaN. */
function aNumero(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" ? Number.NaN : Number(limpio);
}

/**
 * Onboarding · Paso 2: datos físicos y disponibilidad semanal.
 *
 * Edad, altura, peso y días disponibles son las entradas del modelo de
 * rutinas con IA (además de objetivo, nivel y género). Se validan con
 * `datosFisicosSchema` y quedan en `useOnboardingStore`; se guardan en
 * Firestore recién en RoutineChoiceScreen, junto con objetivo y nivel.
 */
export default function PhysicalDataScreen() {
  const router = useRouter();
  const { datosFisicos, setDatosFisicos } = useOnboardingStore();

  const [form, setForm] = useState<FormularioTexto>({
    edad: datosFisicos ? String(datosFisicos.edad) : "",
    altura: datosFisicos ? String(datosFisicos.altura) : "",
    pesoActual: datosFisicos ? String(datosFisicos.pesoActual) : "",
  });
  const [dias, setDias] = useState<number | null>(
    datosFisicos?.diasDisponibles ?? null,
  );
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});

  const cambiar = (campo: keyof FormularioTexto) => (valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const elegirDias = (valor: number) => {
    setDias(valor);
    if (errores.diasDisponibles) {
      setErrores((prev) => ({ ...prev, diasDisponibles: undefined }));
    }
  };

  const handleSiguiente = () => {
    const resultado = datosFisicosSchema.safeParse({
      edad: aNumero(form.edad),
      altura: aNumero(form.altura),
      pesoActual: aNumero(form.pesoActual),
      diasDisponibles: dias ?? undefined,
    });
    if (!resultado.success) {
      const nuevos: Partial<Record<Campo, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as Campo;
        nuevos[campo] ??= issue.message;
      }
      setErrores(nuevos);
      return;
    }
    setDatosFisicos(resultado.data);
    router.push("/(onboarding)/rutina");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 bg-primary-light/15 px-5 pt-6">
          <TouchableOpacity
            className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-primary-light/30"
            onPress={() => router.back()}
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color={palette.foreground} />
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-foreground">
            Cuéntanos sobre ti
          </Text>
          <Text className="mt-1 text-sm text-text-muted">
            La IA usa estos datos para ajustar tu rutina a tu cuerpo y a tu
            tiempo
          </Text>

          <ScrollView
            className="mt-6 flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CampoTexto
              etiqueta="Edad (años)"
              keyboardType="number-pad"
              placeholder="25"
              value={form.edad}
              onChangeText={cambiar("edad")}
              error={errores.edad}
              maxLength={2}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Altura (cm)"
                  keyboardType="decimal-pad"
                  placeholder="170"
                  value={form.altura}
                  onChangeText={cambiar("altura")}
                  error={errores.altura}
                  maxLength={5}
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Peso (kg)"
                  keyboardType="decimal-pad"
                  placeholder="70"
                  value={form.pesoActual}
                  onChangeText={cambiar("pesoActual")}
                  error={errores.pesoActual}
                  maxLength={5}
                />
              </View>
            </View>

            <Text className="mb-3 mt-2 text-base font-semibold text-foreground">
              ¿Cuántos días por semana puedes entrenar?
            </Text>
            <View className="flex-row justify-between">
              {OPCIONES_DIAS_DISPONIBLES.map((valor) => {
                const activo = dias === valor;
                return (
                  <TouchableOpacity
                    key={valor}
                    className={`h-14 w-[18%] items-center justify-center rounded-xl border ${
                      activo
                        ? "border-primary bg-primary"
                        : "border-primary-light bg-background"
                    }`}
                    onPress={() => elegirDias(valor)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                    accessibilityLabel={`${valor} días por semana`}
                  >
                    <Text
                      className={`text-lg font-bold ${
                        activo ? "text-background" : "text-foreground"
                      }`}
                    >
                      {valor}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errores.diasDisponibles ? (
              <Text className="mt-2 text-xs text-error">
                {errores.diasDisponibles}
              </Text>
            ) : null}
            <View className="h-4" />
          </ScrollView>

          <View className="pb-4 pt-2">
            <BotonPrimario titulo="Siguiente" onPress={handleSiguiente} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
