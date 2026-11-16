import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { IndicadorCarga } from "@/shared/ui/LoadingIndicator";
import { AppHeader } from "@/shared/ui/AppHeader";
import { BotonPrimario } from "@/shared/ui/PrimaryButton";
import { PantallaBase } from "@/shared/ui/ScreenBase";
import { CampoFormulario } from "@/shared/ui/FormField";
import { Text } from "@/shared/ui/Typography";
import { SelectorNivel } from "@/features/profile/view/LevelSelector";
import { SelectorObjetivo } from "@/features/profile/view/GoalSelector";
import { ErrorCarga } from "@/shared/ui/LoadError";
import { palette } from "@/shared/theme/palette";
import { AuthController } from "@/features/auth/controller/AuthController";
import { useErrorDeCarga } from "@/shared/hooks/useLoadError";
import { useGoogleAuth } from "@/features/auth/controller/useGoogleAuth";
import {
  GENEROS_USUARIO,
  OPCIONES_DIAS_DISPONIBLES,
  type GeneroUsuario,
  type NivelExperiencia,
  type ObjetivoUsuario,
  type Usuario,
} from "@/features/profile";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/core/errors/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { signOutFromGoogle } = useGoogleAuth();
  const router = useRouter();

  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [edad, setEdad] = useState("");
  const [altura, setAltura] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { error, intento, reportar, reintentar } = useErrorDeCarga();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = AuthController.observarPerfil(
      user.uid,
      (datos) => {
        setPerfil(datos);
        setEdad(datos?.edad ? String(datos.edad) : "");
        setAltura(datos?.altura ? String(datos.altura) : "");
        setCargando(false);
      },
      (causa) => reportar("perfil", causa),
    );

    return unsubscribe;
  }, [user, intento, reportar]);

  const handleGuardarMedidas = async () => {
    if (!user) return;
    const edadNum = parseInt(edad, 10);
    const alturaNum = parseFloat(altura);

    setGuardando(true);
    try {
      await AuthController.actualizarPerfil(user.uid, {
        edad: edadNum > 0 ? edadNum : undefined,
        altura: alturaNum > 0 ? alturaNum : undefined,
      });
      toast.exito("Edad y altura guardadas.");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar tus datos.",
      );
    } finally {
      setGuardando(false);
    }
  };

  /** Guarda un cambio de una sola opción y avisa del resultado. */
  const guardarOpcion = async (
    cambio: Partial<Usuario>,
    exito: string,
    fallo: string,
  ) => {
    if (!user) return;
    try {
      await AuthController.actualizarPerfil(user.uid, cambio);
      toast.exito(exito);
    } catch (error) {
      console.error(fallo, error);
      toast.error(fallo);
    }
  };

  const handleCambiarObjetivo = (objetivo: ObjetivoUsuario) =>
    guardarOpcion(
      { objetivo },
      "Objetivo actualizado.",
      "No se pudo actualizar tu objetivo.",
    );

  const handleCambiarNivel = (nivel: NivelExperiencia) =>
    guardarOpcion(
      { nivel },
      "Nivel actualizado.",
      "No se pudo actualizar tu nivel.",
    );

  const handleCambiarGenero = (genero: GeneroUsuario) =>
    guardarOpcion(
      { genero },
      "Género actualizado.",
      "No se pudo actualizar tu género.",
    );

  const handleCambiarDias = (diasDisponibles: number) =>
    guardarOpcion(
      { diasDisponibles },
      "Días disponibles actualizados.",
      "No se pudieron actualizar tus días disponibles.",
    );

  const handleCerrarSesion = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => void signOutFromGoogle(),
      },
    ]);
  };

  if (error) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorCarga mensaje={error} onReintentar={reintentar} />
      </View>
    );
  }

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <IndicadorCarga size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <PantallaBase
      encabezado={
        <AppHeader title="Mi perfil" onBackPress={() => router.back()} />
      }
      espacioInferior={insets.bottom + 32}
      scrollProps={{ keyboardShouldPersistTaps: "handled" }}
    >
      <View className="mb-8 items-center">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-3xl font-bold text-background">
            {(perfil?.nombre || user?.displayName || "U")
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          className="text-xl font-bold text-foreground"
        >
          {perfil?.nombre} {perfil?.apellidos}
        </Text>
        <Text className="text-sm text-text-muted">
          {perfil?.email || user?.email}
        </Text>
      </View>

      <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
        Preferencias
      </Text>
      <Text className="mb-5 text-sm text-text-secondary">
        Se guardan solas al tocar una opción.
      </Text>

      <Text className="mb-3 text-base font-bold text-foreground">Objetivo</Text>
      <View className="mb-7">
        <SelectorObjetivo
          valor={perfil?.objetivo}
          onCambiar={handleCambiarObjetivo}
          variante="compacta"
        />
      </View>

      <Text className="mb-3 text-base font-bold text-foreground">
        Nivel de experiencia
      </Text>
      <View className="mb-7">
        <SelectorNivel
          valor={perfil?.nivel}
          onCambiar={handleCambiarNivel}
          variante="compacta"
        />
      </View>

      <Text className="mb-3 text-base font-bold text-foreground">
        Días disponibles por semana
      </Text>
      <View className="mb-7 flex-row flex-wrap gap-2">
        {OPCIONES_DIAS_DISPONIBLES.map((valor) => {
          const activo = perfil?.diasDisponibles === valor;
          return (
            <Pressable
              key={valor}
              className={`h-11 w-11 items-center justify-center rounded-full border active:scale-95 active:opacity-80 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              onPress={() => handleCambiarDias(valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${valor} días por semana`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activo ? "text-background" : "text-foreground"
                }`}
              >
                {valor}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-3 text-base font-bold text-foreground">Género</Text>
      <View className="mb-7 flex-row flex-wrap gap-2">
        {(
          Object.entries(GENEROS_USUARIO) as [
            GeneroUsuario,
            (typeof GENEROS_USUARIO)[GeneroUsuario],
          ][]
        ).map(([valor, info]) => {
          const activo = perfil?.genero === valor;
          return (
            <Pressable
              key={valor}
              className={`min-h-11 items-center justify-center rounded-full border px-4 py-2.5 active:scale-95 active:opacity-80 ${
                activo
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              onPress={() => handleCambiarGenero(valor)}
            >
              <Text
                className={`text-sm font-semibold ${
                  activo ? "text-background" : "text-foreground"
                }`}
              >
                {info.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
        Medidas
      </Text>
      <Text className="mb-4 text-sm text-text-secondary">
        Estos datos solo se guardan al tocar «Guardar edad y altura».
      </Text>
      <View className="mb-2 flex-row gap-3">
        <View className="flex-1">
          <CampoFormulario
            centrado
            etiqueta="Edad"
            keyboardType="number-pad"
            value={edad}
            onChangeText={setEdad}
            placeholder="25"
            maxLength={2}
          />
        </View>
        <View className="flex-1">
          <CampoFormulario
            centrado
            etiqueta="Altura (cm)"
            keyboardType="numeric"
            value={altura}
            onChangeText={setAltura}
            placeholder="170"
          />
        </View>
      </View>

      {/* El peso no se edita aquí: se registra en Progreso, que guarda el
          historial y actualiza el peso actual del perfil. */}
      <View className="mt-3 flex-row items-center rounded-xl border border-border bg-primary-light/20 p-3">
        <View className="flex-1">
          <Text className="text-sm text-text-muted">Peso actual</Text>
          <Text className="text-base font-semibold text-foreground">
            {perfil?.pesoActual ? `${perfil.pesoActual} kg` : "Sin registrar"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Registrar peso en Progreso"
          className="min-h-11 flex-row items-center justify-center px-2 active:opacity-70"
          onPress={() => router.push("/(app)/progress")}
        >
          <Text className="mr-1 text-sm font-semibold text-primary">
            Registrar en Progreso
          </Text>
          <Ionicons name="chevron-forward" size={16} color={palette.primary} />
        </Pressable>
      </View>
      <View className="mb-8 mt-3">
        <BotonPrimario
          titulo={guardando ? "Guardando..." : "Guardar edad y altura"}
          onPress={handleGuardarMedidas}
          cargando={guardando}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        className="flex-row items-center justify-center rounded-2xl border border-error p-4 active:scale-[0.98] active:bg-error/10"
        onPress={handleCerrarSesion}
      >
        <Ionicons name="log-out-outline" size={20} color={palette.error} />
        <Text className="ml-2 text-sm font-bold text-error">Cerrar sesión</Text>
      </Pressable>
    </PantallaBase>
  );
}
