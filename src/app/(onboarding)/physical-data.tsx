import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgresoPasos } from "@/components/onboarding/StepProgress";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { CampoTexto } from "@/components/ui/TextField";
import { Text } from "@/components/ui/Typography";
import {
  GENEROS_USUARIO,
  OPCIONES_DIAS_DISPONIBLES,
  type GeneroUsuario,
} from "@/models/entities/User";
import {
  datosFisicosSchema,
  type DatosFisicosInput,
} from "@/schemas/user.schema";
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
  const [genero, setGenero] = useState<GeneroUsuario | null>(
    datosFisicos?.genero ?? null,
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

  const elegirGenero = (valor: GeneroUsuario) => {
    setGenero(valor);
    if (errores.genero) setErrores((prev) => ({ ...prev, genero: undefined }));
  };

  const handleSiguiente = () => {
    const resultado = datosFisicosSchema.safeParse({
      genero: genero ?? undefined,
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
    router.push("/(onboarding)/routine");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 bg-primary-light/15 px-5 pt-6">
          <ProgresoPasos paso={2} onBack={() => router.back()} />

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
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Género
            </Text>
            <View className="mb-4 flex-row gap-3">
              {(
                Object.entries(GENEROS_USUARIO) as [
                  GeneroUsuario,
                  (typeof GENEROS_USUARIO)[GeneroUsuario],
                ][]
              ).map(([valor, info]) => {
                const activo = genero === valor;
                return (
                  <TouchableOpacity
                    key={valor}
                    className={`min-h-12 flex-1 items-center justify-center rounded-xl border ${
                      activo
                        ? "border-primary bg-primary-light/30"
                        : "border-primary-light bg-background"
                    }`}
                    onPress={() => elegirGenero(valor)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text
                      className={`text-sm ${
                        activo
                          ? "font-semibold text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {info.etiqueta}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errores.genero ? (
              <Text className="-mt-2 mb-4 text-sm text-error">
                {errores.genero}
              </Text>
            ) : null}
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
              <Text className="mt-2 text-sm text-error">
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
