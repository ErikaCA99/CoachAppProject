import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { AppHeader } from "@/components/ui/AppHeader";
import { HojaInferior } from "@/components/ui/BottomSheet";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { PantallaBase } from "@/components/ui/ScreenBase";
import { GenerationConfirmationSheet } from "@/components/routines/GenerationConfirmationSheet";
import type { Usuario } from "@/models/entities/User";
import { MiniaturaEjercicio } from "@/components/routines/ExerciseThumbnail";
import { ErrorCarga } from "@/components/ui/LoadError";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RoutinesController";
import { EntrenamientosController } from "@/controllers/WorkoutsController";
import { useErrorDeCarga } from "@/hooks/useLoadError";
import { useIrAMaquina } from "@/hooks/useGoToMachine";
import type { EjercicioRutina, Rutina } from "@/models/entities/Routine";
import type { Entrenamiento } from "@/models/entities/Workout";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/utils/toast";

function RutinaActivaCard({
  rutina,
  diaSugerido,
  diasHechos,
  onIrAMaquina,
  onEmpezarDia,
}: {
  rutina: ConId<Rutina>;
  /** Día que toca entrenar (mismo cálculo que el Inicio), o `null`. */
  diaSugerido: number | null;
  /** Días de esta rutina ya entrenados en la semana en curso. */
  diasHechos: ReadonlySet<number>;
  onIrAMaquina: (ejercicio: EjercicioRutina) => void;
  onEmpezarDia: (numeroDia: number) => void;
}) {
  // `undefined` = el usuario aún no tocó nada: se muestra abierto el día que
  // toca (que puede llegar un instante después, al cargar los entrenamientos).
  const [elegido, setElegido] = useState<number | null | undefined>(undefined);
  const diaExpandido =
    elegido === undefined
      ? (diaSugerido ?? rutina.planSemanal[0]?.dia ?? null)
      : elegido;
  const setDiaExpandido = setElegido;
  const diaPorEmpezar = rutina.planSemanal.find(
    (d) => d.dia === diaSugerido && d.ejercicios.length > 0,
  );

  return (
    <View className="mb-2 rounded-2xl border border-primary/40 bg-primary-light/15 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text
            accessibilityRole="header"
            className="text-lg font-bold text-foreground"
          >
            {rutina.nombre}
          </Text>
          <Text className="text-sm text-text-muted">
            {rutina.diasPorSemana} días/semana
          </Text>
        </View>
        <View className="rounded-full bg-primary px-3 py-1">
          <Text className="text-sm font-bold text-background">ACTIVA</Text>
        </View>
      </View>

      {diaPorEmpezar ? (
        <View className="mb-3">
          <BotonPrimario
            titulo={`Empezar día ${diaPorEmpezar.dia} · ${diaPorEmpezar.enfoque}`}
            onPress={() => onEmpezarDia(diaPorEmpezar.dia)}
          />
        </View>
      ) : null}

      {rutina.planSemanal.map((dia) => {
        const expandido = diaExpandido === dia.dia;
        return (
          <View
            key={dia.dia}
            className="mb-2 overflow-hidden rounded-xl bg-background"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: expandido }}
              className="min-h-12 flex-row items-center justify-between p-3.5 active:bg-primary-light/10"
              onPress={() => setDiaExpandido(expandido ? null : dia.dia)}
            >
              <Text className="flex-1 pr-2 text-sm font-bold text-foreground">
                Día {dia.dia}: {dia.enfoque}
                {dia.dia === diaSugerido ? " · hoy" : ""}
              </Text>
              {diasHechos.has(dia.dia) ? (
                <View className="mr-2 flex-row items-center rounded-full bg-primary/10 px-2.5 py-1">
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={palette.primary}
                    accessible={false}
                  />
                  <Text className="ml-1 text-sm font-bold text-primary">
                    Hecho
                  </Text>
                </View>
              ) : null}
              <Ionicons
                name={expandido ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.textMuted}
              />
            </Pressable>
            {expandido && (
              <View className="px-3.5 pb-3.5">
                {dia.ejercicios.map((ejercicio, indice) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`${ejercicio.maquinaId}-${indice}`}
                    className="mb-2 flex-row items-center rounded-lg border border-border p-2.5 active:scale-[0.98] active:bg-primary-light/10"
                    onPress={() => onIrAMaquina(ejercicio)}
                  >
                    <MiniaturaEjercicio
                      ejercicioId={ejercicio.maquinaId}
                      imagenUrl={ejercicio.imagenUrl}
                      nombre={ejercicio.nombre}
                      tamano={40}
                    />
                    <View className="ml-2.5 flex-1">
                      <Text
                        className="text-sm font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {ejercicio.nombre}
                      </Text>
                      <Text className="mt-0.5 text-base font-bold text-foreground">
                        {ejercicio.series} series × {ejercicio.repeticiones}{" "}
                        reps
                      </Text>
                      <Text className="text-sm text-text-secondary">
                        Descanso {ejercicio.descansoSegundos} s
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {dia.ejercicios.length === 0 ? (
                  <Text className="text-sm text-text-muted">
                    Sin ejercicios en este día.
                  </Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    className="mt-1 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
                    onPress={() => onEmpezarDia(dia.dia)}
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color={palette.background}
                    />
                    <Text className="text-sm font-bold text-background">
                      Empezar día {dia.dia}
                    </Text>
                  </Pressable>
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

  const irAMaquina = useIrAMaquina();

  const [rutinas, setRutinas] = useState<ConId<Rutina>[]>([]);
  const [entrenamientos, setEntrenamientos] = useState<ConId<Entrenamiento>[]>(
    [],
  );
  const [menuRutina, setMenuRutina] = useState<ConId<Rutina> | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [confirmandoGeneracion, setConfirmandoGeneracion] = useState(false);
  const [rutinaActivaId, setRutinaActivaId] = useState<string | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [cargandoRutinas, setCargandoRutinas] = useState(true);
  const { error, intento, reportar, reintentar } = useErrorDeCarga();

  useEffect(() => {
    if (!user) return;

    const unsubPerfil = AuthController.observarPerfil(
      user.uid,
      (perfil) => {
        setPerfil(perfil);
        setRutinaActivaId(perfil?.rutinaActivaId ?? null);
        setCargandoPerfil(false);
      },
      (causa) => reportar("perfil", causa),
    );

    const unsubRutinas = RutinasController.observar(
      user.uid,
      (lista) => {
        setRutinas(lista);
        setCargandoRutinas(false);
      },
      (causa) => reportar("rutinas", causa),
    );

    // Solo se usan para sugerir el día de hoy y marcar los días hechos: si
    // fallan, la pantalla funciona igual sin esas marcas.
    const unsubEntrenos = EntrenamientosController.observar(
      user.uid,
      setEntrenamientos,
    );

    return () => {
      unsubPerfil();
      unsubRutinas();
      unsubEntrenos();
    };
  }, [user, intento, reportar]);

  const rutinaActiva = rutinas.find((r) => r.id === rutinaActivaId) ?? null;
  const otrasRutinas = rutinas.filter((r) => r.id !== rutinaActivaId);

  const diaSugerido = useMemo(
    () =>
      rutinaActiva
        ? EntrenamientosController.diaSugerido(rutinaActiva, entrenamientos)
        : null,
    [rutinaActiva, entrenamientos],
  );

  const diasHechos = useMemo(() => {
    if (!rutinaActiva) return new Set<number>();
    const fechasSemana = new Set(
      EntrenamientosController.resumen(entrenamientos)
        .dias.filter((d) => d.completado)
        .map((d) => d.fecha),
    );
    return new Set(
      entrenamientos
        .filter(
          (e) => e.rutinaId === rutinaActiva.id && fechasSemana.has(e.fecha),
        )
        .map((e) => e.dia),
    );
  }, [rutinaActiva, entrenamientos]);

  const handleActivar = async (rutina: ConId<Rutina>) => {
    if (!user) return;
    const uid = user.uid;
    try {
      const anterior = await RutinasController.activarConAnterior(
        uid,
        rutina.id,
      );
      toast.exito(`«${rutina.nombre}» es ahora tu rutina activa.`, {
        duracionMs: 6000,
        accion: {
          etiqueta: "DESHACER",
          ejecutar: async () => {
            await RutinasController.deshacerActivacion(
              uid,
              rutina.id,
              anterior?.id ?? null,
            );
            toast.exito(
              anterior
                ? `«${anterior.nombre}» vuelve a ser tu rutina activa.`
                : "Activación deshecha.",
            );
          },
        },
      });
    } catch (error) {
      console.error("Error al activar rutina:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo activar la rutina. Inténtalo de nuevo.",
      );
    }
  };

  const handleEliminar = (rutina: ConId<Rutina>) => {
    if (!user) return;
    const uid = user.uid;
    Alert.alert(
      "Eliminar rutina",
      `¿Eliminar «${rutina.nombre}»? No se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await RutinasController.eliminar(uid, rutina.id);
              toast.exito("Rutina eliminada.");
            } catch (error) {
              console.error("Error al eliminar rutina:", error);
              toast.error("No se pudo eliminar la rutina. Inténtalo de nuevo.");
            }
          },
        },
      ],
    );
  };

  /** Un solo punto de entrada: la IA pide confirmación, la personalizada no. */
  const handleNuevaRutina = () => {
    Alert.alert("Nueva rutina", "¿Cómo quieres crearla?", [
      { text: "Generar con IA", onPress: () => setConfirmandoGeneracion(true) },
      {
        text: "Crear personalizada",
        onPress: () => router.push("/(app)/routines/custom"),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  if (error) {
    return (
      <View className="flex-1 justify-center bg-background">
        <ErrorCarga mensaje={error} onReintentar={reintentar} />
      </View>
    );
  }

  if (cargandoPerfil || cargandoRutinas) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <IndicadorCarga size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <>
      <PantallaBase
        encabezado={
          <AppHeader
            title="Rutinas"
            subtitle={
              rutinaActiva
                ? "Tu plan de entrenamiento actual"
                : "Aún no tienes una rutina activa"
            }
            onProfilePress={() => router.push("/(app)/profile")}
          />
        }
      >
        {rutinaActiva ? (
          <RutinaActivaCard
            // key fuerza a React a remontar el componente (y reiniciar su
            // estado `diaExpandido`) cuando cambia la rutina activa; sin esto,
            // React reutiliza la misma instancia y el día expandido queda
            // "pegado" al de la rutina anterior.
            key={rutinaActiva.id}
            rutina={rutinaActiva}
            diaSugerido={diaSugerido}
            diasHechos={diasHechos}
            onIrAMaquina={irAMaquina}
            onEmpezarDia={(numeroDia) =>
              router.push({
                pathname: "/(app)/train",
                params: { dia: String(numeroDia) },
              })
            }
          />
        ) : (
          <View className="mb-4 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="flex-1 items-center rounded-2xl border border-primary bg-primary-light/20 p-5 active:scale-[0.98] active:opacity-85"
              onPress={() => setConfirmandoGeneracion(true)}
            >
              <Ionicons name="sparkles" size={28} color={palette.primary} />
              <Text className="mt-2 text-center text-sm font-bold text-foreground">
                Generar con IA
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="flex-1 items-center rounded-2xl border border-accent-strong bg-accent/10 p-5 active:scale-[0.98] active:opacity-85"
              onPress={() => router.push("/(app)/routines/custom")}
            >
              <Ionicons name="create" size={28} color={palette.accentStrong} />
              <Text className="mt-2 text-center text-sm font-bold text-foreground">
                Crear personalizada
              </Text>
            </Pressable>
          </View>
        )}

        {rutinaActiva && (
          <Pressable
            accessibilityRole="button"
            className="mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-primary px-4 active:scale-[0.98] active:bg-primary-light/10"
            onPress={handleNuevaRutina}
          >
            <Ionicons
              name="add"
              size={18}
              color={palette.primary}
              accessible={false}
            />
            <Text className="text-sm font-bold text-primary">Nueva rutina</Text>
          </Pressable>
        )}

        {otrasRutinas.length > 0 && (
          <View className="mt-8">
            <Text className="mb-3 text-base font-bold text-foreground">
              Rutinas anteriores
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
                  <Text className="mt-0.5 text-sm text-text-secondary">
                    {rutina.diasPorSemana} días/semana ·{" "}
                    {rutina.tipo !== "ia"
                      ? "Personalizada"
                      : rutina.origenPlan === "modelo"
                        ? `Generada con IA · modelo v${rutina.versionModelo}`
                        : rutina.origenPlan === "heuristica"
                          ? "Generada con IA · reglas de respaldo"
                          : "Generada con IA"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="mr-4 min-h-11 justify-center rounded-lg bg-primary px-4 active:scale-95 active:opacity-85"
                  onPress={() => handleActivar(rutina)}
                >
                  <Text className="text-sm font-bold text-background">
                    Activar
                  </Text>
                </Pressable>
                <Pressable
                  className="h-11 w-11 items-center justify-center rounded-lg active:bg-primary-light/20"
                  accessibilityRole="button"
                  accessibilityLabel={`Más opciones de ${rutina.nombre}`}
                  onPress={() => setMenuRutina(rutina)}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={palette.foreground}
                    accessible={false}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </PantallaBase>

      <HojaInferior
        visible={menuRutina !== null}
        onCerrar={() => setMenuRutina(null)}
        titulo={menuRutina?.nombre}
        etiquetaCerrar="Cerrar menú"
        alturaMaxima="50%"
      >
        <Pressable
          accessibilityRole="button"
          className="min-h-14 flex-row items-center rounded-xl px-2 active:bg-accent-strong/10"
          onPress={() => {
            const rutina = menuRutina;
            setMenuRutina(null);
            if (rutina) handleEliminar(rutina);
          }}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={palette.accentStrong}
            accessible={false}
          />
          <Text className="ml-3 text-base font-semibold text-accent-strong">
            Eliminar rutina
          </Text>
        </Pressable>
      </HojaInferior>

      {confirmandoGeneracion && (
        <GenerationConfirmationSheet
          objetivoInicial={perfil?.objetivo}
          nivelInicial={perfil?.nivel}
          diasDisponibles={perfil?.diasDisponibles}
          rutinaActual={rutinaActiva?.nombre}
          onCerrar={() => setConfirmandoGeneracion(false)}
          onConfirmar={({ objetivo, nivel }) => {
            setConfirmandoGeneracion(false);
            router.push({
              pathname: "/(app)/routines/generate",
              params: { objetivo, nivel, confirmado: "1" },
            });
          }}
        />
      )}
    </>
  );
}
