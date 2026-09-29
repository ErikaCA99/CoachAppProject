import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RutinasController";
import type { Rutina } from "@/models/entities/Rutina";
import type { ConId } from "@/services/firebase/firestoreService";
import { useAuthStore } from "@/store/auth.store";

function RutinaActivaCard({
  rutina,
  onIrAMaquina,
}: {
  rutina: ConId<Rutina>;
  onIrAMaquina: (maquinaId: number) => void;
}) {
  const [diaExpandido, setDiaExpandido] = useState<number | null>(
    rutina.planSemanal[0]?.dia ?? null,
  );

  return (
    <View className="mb-2 rounded-2xl border border-primary/40 bg-primary-light/15 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-foreground">
            {rutina.nombre}
          </Text>
          <Text className="text-xs text-text-muted">
            {rutina.diasPorSemana} días/semana
          </Text>
        </View>
        <View className="rounded-full bg-primary px-3 py-1">
          <Text className="text-[10px] font-bold text-background">ACTIVA</Text>
        </View>
      </View>

      {rutina.planSemanal.map((dia) => {
        const expandido = diaExpandido === dia.dia;
        return (
          <View
            key={dia.dia}
            className="mb-2 overflow-hidden rounded-xl bg-background"
          >
            <TouchableOpacity
              className="flex-row items-center justify-between p-3.5"
              onPress={() => setDiaExpandido(expandido ? null : dia.dia)}
            >
              <Text className="flex-1 pr-2 text-sm font-bold text-foreground">
                Día {dia.dia}: {dia.enfoque}
              </Text>
              <Ionicons
                name={expandido ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.textMuted}
              />
            </TouchableOpacity>
            {expandido && (
              <View className="px-3.5 pb-3.5">
                {dia.ejercicios.map((ejercicio, indice) => (
                  <TouchableOpacity
                    key={`${ejercicio.maquinaId}-${indice}`}
                    className="mb-2 flex-row items-center rounded-lg border border-border p-2.5"
                    onPress={() => onIrAMaquina(ejercicio.maquinaId)}
                  >
                    {ejercicio.imagenUrl ? (
                      <Image
                        source={{ uri: ejercicio.imagenUrl }}
                        className="h-10 w-10 rounded-md"
                      />
                    ) : (
                      <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-light/40">
                        <Ionicons
                          name="barbell-outline"
                          size={16}
                          color={palette.primary}
                        />
                      </View>
                    )}
                    <View className="ml-2.5 flex-1">
                      <Text
                        className="text-xs font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {ejercicio.nombre}
                      </Text>
                      <Text className="text-[11px] text-text-muted">
                        {ejercicio.series} series × {ejercicio.repeticiones}{" "}
                        reps · {ejercicio.descansoSegundos}s descanso
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {dia.ejercicios.length === 0 && (
                  <Text className="text-xs text-text-muted">
                    Sin ejercicios en este día.
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function RoutinesScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [rutinas, setRutinas] = useState<ConId<Rutina>[]>([]);
  const [rutinaActivaId, setRutinaActivaId] = useState<string | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [cargandoRutinas, setCargandoRutinas] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubPerfil = AuthController.observarPerfil(user.uid, (perfil) => {
      setRutinaActivaId(perfil?.rutinaActivaId ?? null);
      setCargandoPerfil(false);
    });

    const unsubRutinas = RutinasController.observar(user.uid, (lista) => {
      setRutinas(lista);
      setCargandoRutinas(false);
    });

    return () => {
      unsubPerfil();
      unsubRutinas();
    };
  }, [user]);

  const rutinaActiva = rutinas.find((r) => r.id === rutinaActivaId) ?? null;
  const otrasRutinas = rutinas.filter((r) => r.id !== rutinaActivaId);

  const handleActivar = async (rutinaId: string) => {
    if (!user) return;
    await RutinasController.activar(user.uid, rutinaId);
  };

  const handleEliminar = (rutinaId: string) => {
    if (!user) return;
    Alert.alert("Eliminar rutina", "¿Seguro que quieres eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          RutinasController.eliminar(user.uid, rutinaId).catch((error) =>
            console.error("Error al eliminar rutina:", error),
          );
        },
      },
    ]);
  };

  if (cargandoPerfil || cargandoRutinas) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-1 text-2xl font-bold text-foreground">Rutinas</Text>
      <Text className="mb-6 text-sm text-text-muted">
        {rutinaActiva
          ? "Tu plan de entrenamiento actual"
          : "Aún no tienes una rutina activa"}
      </Text>

      {rutinaActiva ? (
        <RutinaActivaCard
          // key fuerza a React a remontar el componente (y reiniciar su
          // estado `diaExpandido`) cuando cambia la rutina activa; sin esto,
          // React reutiliza la misma instancia y el día expandido queda
          // "pegado" al de la rutina anterior.
          key={rutinaActiva.id}
          rutina={rutinaActiva}
          onIrAMaquina={(maquinaId) =>
            router.push(`/(app)/machines/${maquinaId}` as Href)
          }
        />
      ) : (
        <View className="mb-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 items-center rounded-2xl border border-primary bg-primary-light/20 p-5"
            onPress={() => router.push("/(app)/routines/generar" as Href)}
          >
            <Ionicons name="sparkles" size={28} color={palette.primary} />
            <Text className="mt-2 text-center text-sm font-bold text-foreground">
              Generar con IA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-2xl border border-accent-strong bg-accent/10 p-5"
            onPress={() => router.push("/(app)/routines/personalizada" as Href)}
          >
            <Ionicons name="create" size={28} color={palette.accentStrong} />
            <Text className="mt-2 text-center text-sm font-bold text-foreground">
              Crear personalizada
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {rutinaActiva && (
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 items-center rounded-2xl border border-border p-3.5"
            onPress={() => router.push("/(app)/routines/generar" as Href)}
          >
            <Text className="text-xs font-bold text-foreground">
              Generar otra con IA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-2xl border border-border p-3.5"
            onPress={() => router.push("/(app)/routines/personalizada" as Href)}
          >
            <Text className="text-xs font-bold text-foreground">
              Crear personalizada
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {otrasRutinas.length > 0 && (
        <View className="mt-8">
          <Text className="mb-3 text-base font-bold text-foreground">
            Historial de rutinas
          </Text>
          {otrasRutinas.map((rutina) => (
            <View
              key={rutina.id}
              className="mb-2.5 flex-row items-center rounded-2xl border border-border p-4"
            >
              <View className="flex-1 pr-2">
                <Text className="text-sm font-semibold text-foreground">
                  {rutina.nombre}
                </Text>
                <Text className="mt-0.5 text-xs text-text-muted">
                  {rutina.diasPorSemana} días/semana ·{" "}
                  {rutina.tipo === "ia" ? "Generada con IA" : "Personalizada"}
                </Text>
              </View>
              <TouchableOpacity
                className="mr-2 rounded-lg bg-primary px-3 py-2"
                onPress={() => handleActivar(rutina.id)}
              >
                <Text className="text-xs font-bold text-background">
                  Activar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg border border-error p-2"
                onPress={() => handleEliminar(rutina.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={palette.error}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
