import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GenerationConfirmationSheet } from "@/components/routines/GenerationConfirmationSheet";
import type { ParametrosGeneracion } from "@/models/entities/Routine";
import { RoutinePreview } from "@/components/routines/RoutinePreview";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { useGeneracionRutina } from "@/hooks/useRoutineGeneration";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type NivelExperiencia,
  type ObjetivoUsuario,
} from "@/models/entities/User";

export default function GenerarRutinaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    objetivo?: string;
    nivel?: string;
    confirmado?: string;
  }>();
  const inicial: ParametrosGeneracion | null =
    params.confirmado === "1" &&
    typeof params.objetivo === "string" &&
    Object.hasOwn(OBJETIVOS_USUARIO, params.objetivo) &&
    typeof params.nivel === "string" &&
    Object.hasOwn(NIVELES_EXPERIENCIA, params.nivel)
      ? {
          objetivo: params.objetivo as ObjetivoUsuario,
          nivel: params.nivel as NivelExperiencia,
        }
      : null;
  const volver = useCallback(() => router.replace("/(app)/routines"), [router]);
  const flujo = useGeneracionRutina(inicial, volver);
  const { salir, guardando } = flujo;

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!guardando) salir();
      return true;
    });
    return () => listener.remove();
  }, [salir, guardando]);

  if (flujo.fase === "preview" && flujo.borrador) {
    return (
      <RoutinePreview
        rutina={flujo.borrador}
        rutinaActual={flujo.activa?.nombre}
        guardando={guardando}
        puedeEditar={flujo.puedeEditar}
        error={flujo.error}
        onSalir={salir}
        onGuardar={flujo.guardar}
        onReemplazar={flujo.reemplazar}
      />
    );
  }

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View className="items-center">
          {flujo.fase === "error" ? (
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={palette.textSecondary}
              accessible={false}
            />
          ) : flujo.fase === "confirmacion" ? (
            <Ionicons
              name="sparkles-outline"
              size={48}
              color={palette.primary}
              accessible={false}
            />
          ) : (
            <ActivityIndicator
              size="large"
              color={palette.primary}
              accessibilityLabel={
                flujo.fase === "generando"
                  ? "Diseñando tu rutina"
                  : "Cargando perfil"
              }
            />
          )}
          <Text
            accessibilityRole="header"
            className="mt-6 text-center text-2xl font-bold text-foreground"
          >
            {flujo.fase === "generando"
              ? "Diseñando tu nueva rutina…"
              : flujo.fase === "error"
                ? "No pudimos completar este paso"
                : flujo.fase === "confirmacion"
                  ? "Prepara tu nueva rutina"
                  : "Cargando tu perfil…"}
          </Text>
          {flujo.fase === "generando" && (
            <>
              <Text className="mt-3 text-center text-base text-text-secondary">
                Esto puede tomar unos 10 a 15 segundos. Si tarda más, puedes
                cancelar y volver.
              </Text>
              <View className="mt-8 w-full rounded-xl border border-border bg-primary-light/15 p-4">
                <Text className="mb-3 text-base font-semibold text-foreground">
                  Parámetros aplicados
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <View className="rounded-xl bg-primary-light/30 px-3 py-2">
                    <Text className="text-sm text-primary-dark">
                      Objetivo:{" "}
                      {flujo.parametros &&
                        OBJETIVOS_USUARIO[flujo.parametros.objetivo].etiqueta}
                    </Text>
                  </View>
                  <View className="rounded-xl bg-primary-light/30 px-3 py-2">
                    <Text className="text-sm text-primary-dark">
                      Nivel:{" "}
                      {flujo.parametros &&
                        NIVELES_EXPERIENCIA[flujo.parametros.nivel].etiqueta}
                    </Text>
                  </View>
                </View>
              </View>
              <Text className="mt-5 text-center text-sm text-text-secondary">
                Tu rutina actual sigue activa. Todavía no se guardará ningún
                cambio.
              </Text>
            </>
          )}
          {flujo.fase === "error" && (
            <>
              <Text
                accessibilityRole="alert"
                className="mt-4 text-center text-base text-text-secondary"
              >
                {flujo.error}
              </Text>
              <View className="mt-6 self-stretch">
                <BotonPrimario titulo="Reintentar" onPress={flujo.reintentar} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        onPress={salir}
        className="mx-6 mb-5 min-h-12 items-center justify-center rounded-xl px-4 py-3"
      >
        <Text className="text-center text-base font-semibold text-text-secondary">
          {flujo.fase === "generando"
            ? "Cancelar y volver a mi rutina"
            : "Volver a mis rutinas"}
        </Text>
      </Pressable>
      {flujo.fase === "confirmacion" && (
        <GenerationConfirmationSheet
          objetivoInicial={flujo.perfil?.objetivo}
          nivelInicial={flujo.perfil?.nivel}
          diasDisponibles={flujo.perfil?.diasDisponibles}
          rutinaActual={flujo.activa?.nombre}
          onCerrar={salir}
          onConfirmar={flujo.confirmar}
        />
      )}
    </View>
  );
}
