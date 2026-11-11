import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";

import { IndicadorCarga } from "@/shared/ui/LoadingIndicator";
import { HojaInferior } from "@/shared/ui/BottomSheet";
import { ErrorEnLinea } from "@/shared/ui/InlineError";
import { BotonPrimario } from "@/shared/ui/PrimaryButton";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import { RutinasController } from "@/features/routines/controller/RoutinesController";
import type { Maquina } from "@/features/machines/model/entities/Machine";
import type { Rutina } from "@/features/routines";
import type { ConId } from "@/core/types";
import { toast } from "@/core/errors/toast";

interface ModalAgregarRutinaProps {
  visible: boolean;
  maquina: Maquina;
  usuarioId: string;
  onCerrar: () => void;
}

const PARAMETROS_POR_DEFECTO = {
  series: 3,
  repeticiones: 12,
  descansoSegundos: 60,
};

function Contador({
  etiqueta,
  valor,
  min,
  max,
  paso = 1,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  onCambiar: (valor: number) => void;
}) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary-light/20 py-2">
      <Text className="text-sm font-semibold text-text-secondary">
        {etiqueta}
      </Text>
      <View className="mt-1 flex-row items-center">
        <TouchableOpacity
          onPress={() => onCambiar(Math.max(min, valor - paso))}
          accessibilityRole="button"
          accessibilityLabel={`Menos ${etiqueta}`}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons
            name="remove-circle-outline"
            size={22}
            color={palette.primary}
          />
        </TouchableOpacity>
        <Text className="mx-2 min-w-[28px] text-center text-base font-bold text-foreground">
          {valor}
        </Text>
        <TouchableOpacity
          onPress={() => onCambiar(Math.min(max, valor + paso))}
          accessibilityRole="button"
          accessibilityLabel={`Más ${etiqueta}`}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={palette.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Hoja inferior para agregar un ejercicio de esta máquina a un día de la
 * rutina activa. Solo se ofrecen los ejercicios que existen en wger, porque
 * las rutinas guardan el id de wger (`maquinaId`).
 */
export function ModalAgregarRutina({
  visible,
  maquina,
  usuarioId,
  onCerrar,
}: ModalAgregarRutinaProps) {
  const router = useRouter();
  const ejercicios = useMemo(
    () => maquina.ejercicios.filter((e) => e.wgerId !== null),
    [maquina],
  );

  const [rutina, setRutina] = useState<ConId<Rutina> | null | undefined>();
  const [indiceEjercicio, setIndiceEjercicio] = useState(0);
  const [dia, setDia] = useState<number | null>(null);
  const [series, setSeries] = useState(PARAMETROS_POR_DEFECTO.series);
  const [repeticiones, setRepeticiones] = useState(
    PARAMETROS_POR_DEFECTO.repeticiones,
  );
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    RutinasController.obtenerActiva(usuarioId)
      .then((r) => {
        if (!activo) return;
        setRutina(r);
        setDia(r?.planSemanal[0]?.dia ?? null);
      })
      .catch((error) => {
        console.error("Error al cargar la rutina activa:", error);
        if (activo) setRutina(null);
      });
    return () => {
      activo = false;
    };
  }, [visible, usuarioId]);

  const guardar = async () => {
    const ejercicio = ejercicios[indiceEjercicio];
    if (!rutina || dia === null || !ejercicio?.wgerId) return;

    setGuardando(true);
    setErrorGuardado(null);
    try {
      await RutinasController.agregarEjercicioADia(usuarioId, rutina.id, dia, {
        maquinaId: ejercicio.wgerId,
        maquinaCatalogoId: maquina.id,
        nombre: ejercicio.nombre,
        imagenUrl: null,
        series,
        repeticiones,
        descansoSegundos: PARAMETROS_POR_DEFECTO.descansoSegundos,
      });
      onCerrar();
      toast.exito(
        `"${ejercicio.nombre}" se agregó al día ${dia} de tu rutina.`,
      );
    } catch (error) {
      // Dentro del Modal un toast quedaría tapado: el error va en línea.
      setErrorGuardado(
        error instanceof Error
          ? `No se pudo agregar: ${error.message}`
          : "No se pudo agregar. Intenta nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <HojaInferior
      visible={visible}
      onCerrar={onCerrar}
      titulo="Agregar a mi rutina"
    >
      <Text className="mb-4 text-sm text-text-secondary">{maquina.nombre}</Text>

      {rutina === undefined ? (
        <IndicadorCarga
          color={palette.primary}
          style={{ marginVertical: 24 }}
        />
      ) : rutina === null ? (
        <View className="items-center py-4">
          <Ionicons
            name="calendar-outline"
            size={36}
            color={palette.textMuted}
          />
          <Text className="mt-2 text-center text-sm text-text-secondary">
            Todavía no tienes una rutina activa.
          </Text>
          <View className="mt-4 w-full">
            <BotonPrimario
              titulo="Crear una rutina"
              onPress={() => {
                onCerrar();
                router.push("/(app)/routines");
              }}
            />
          </View>
        </View>
      ) : ejercicios.length === 0 ? (
        <Text className="py-4 text-center text-sm text-text-secondary">
          Esta máquina no tiene ejercicios que se puedan agregar a una rutina.
        </Text>
      ) : (
        <View>
          <Text className="mb-2 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Ejercicio
          </Text>
          {ejercicios.map((e, i) => {
            const activo = i === indiceEjercicio;
            return (
              <TouchableOpacity
                key={`${e.wgerId}-${i}`}
                className={`mb-2 flex-row items-center rounded-xl border p-3 ${
                  activo
                    ? "border-primary bg-primary-light/25"
                    : "border-primary-light/70"
                }`}
                onPress={() => setIndiceEjercicio(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
              >
                <Ionicons
                  name={activo ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={activo ? palette.primary : palette.textMuted}
                />
                <Text className="ml-2 flex-1 text-sm text-foreground">
                  {e.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}

          <Text className="mb-2 mt-3 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Día · {rutina.nombre}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {rutina.planSemanal.map((d) => {
              const activo = d.dia === dia;
              return (
                <TouchableOpacity
                  key={d.dia}
                  className={`min-h-11 justify-center rounded-xl border px-3 py-2 ${
                    activo
                      ? "border-primary bg-primary"
                      : "border-primary-light/70"
                  }`}
                  onPress={() => setDia(d.dia)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Text
                    className={`text-sm font-bold ${
                      activo ? "text-background" : "text-foreground"
                    }`}
                  >
                    Día {d.dia}
                  </Text>
                  <Text
                    className={`max-w-[120px] text-sm ${
                      activo ? "text-background/90" : "text-text-secondary"
                    }`}
                    numberOfLines={1}
                  >
                    {d.enfoque}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-4 flex-row gap-3">
            <Contador
              etiqueta="Series"
              valor={series}
              min={1}
              max={10}
              onCambiar={setSeries}
            />
            <Contador
              etiqueta="Repeticiones"
              valor={repeticiones}
              min={1}
              max={50}
              onCambiar={setRepeticiones}
            />
          </View>

          <View className="mt-5">
            <ErrorEnLinea mensaje={errorGuardado} />
            <BotonPrimario
              titulo="Agregar"
              onPress={guardar}
              cargando={guardando}
              deshabilitado={dia === null}
            />
          </View>
        </View>
      )}
    </HojaInferior>
  );
}
