import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { HojaInferior } from "@/components/ui/BottomSheet";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { SelectorNivel } from "@/components/user/LevelSelector";
import { SelectorObjetivo } from "@/components/user/GoalSelector";
import { palette } from "@/constants/palette";
import type { ParametrosGeneracion } from "@/models/entities/Routine";
import {
  NIVELES_EXPERIENCIA,
  OBJETIVOS_USUARIO,
  type NivelExperiencia,
  type ObjetivoUsuario,
} from "@/models/entities/User";

interface Props {
  objetivoInicial?: ObjetivoUsuario | null;
  nivelInicial?: NivelExperiencia | null;
  diasDisponibles?: number;
  rutinaActual?: string;
  onCerrar: () => void;
  onConfirmar: (parametros: ParametrosGeneracion) => void;
}

/** Se monta al abrir para que cada intento empiece con los datos del perfil. */
export function GenerationConfirmationSheet({
  objetivoInicial,
  nivelInicial,
  diasDisponibles,
  rutinaActual,
  onCerrar,
  onConfirmar,
}: Props) {
  const [objetivo, setObjetivo] = useState(objetivoInicial ?? null);
  const [nivel, setNivel] = useState(nivelInicial ?? null);
  const [editando, setEditando] = useState(!objetivoInicial || !nivelInicial);

  return (
    <HojaInferior
      visible
      onCerrar={onCerrar}
      titulo="¿Generar nueva rutina con IA?"
      etiquetaCerrar="Cancelar generación"
      alturaMaxima="92%"
    >
      <Text className="mb-5 text-base text-text-secondary">
        Revisa los datos que usaremos para diseñarla:
      </Text>

      <View className="rounded-xl border border-border bg-primary-light/15 p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="flex-1 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Datos de tu perfil
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: editando }}
            onPress={() => setEditando(!editando)}
            className="min-h-11 justify-center px-2"
          >
            <Text className="text-sm font-bold text-primary">
              {editando ? "Listo" : "Editar"}
            </Text>
          </Pressable>
        </View>
        {editando ? (
          <>
            <Text className="mb-2 text-base font-semibold text-foreground">
              Objetivo
            </Text>
            <SelectorObjetivo
              valor={objetivo}
              onCambiar={setObjetivo}
              variante="compacta"
            />
            <Text className="mb-2 mt-4 text-base font-semibold text-foreground">
              Nivel
            </Text>
            <SelectorNivel
              valor={nivel}
              onCambiar={setNivel}
              variante="compacta"
            />
            <Text className="mt-3 text-sm text-text-secondary">
              Estos cambios se aplican solo a esta generación.
            </Text>
          </>
        ) : (
          <>
            <Text className="mb-3 text-base text-foreground">
              Objetivo:{" "}
              {objetivo ? OBJETIVOS_USUARIO[objetivo].etiqueta : "Sin definir"}
            </Text>
            <Text className="mb-3 text-base text-foreground">
              Nivel:{" "}
              {nivel ? NIVELES_EXPERIENCIA[nivel].etiqueta : "Sin definir"}
            </Text>
          </>
        )}
        <Text className="mt-2 text-base text-foreground">
          Disponibilidad:{" "}
          {diasDisponibles
            ? `${diasDisponibles} días por semana`
            : "Según tu nivel"}
        </Text>
      </View>

      <View className="my-5 flex-row gap-2 rounded-xl bg-secondary/30 p-4">
        <Ionicons
          name="shield-checkmark-outline"
          size={22}
          color={palette.foreground}
          accessible={false}
        />
        <Text className="flex-1 text-sm text-foreground">
          {rutinaActual
            ? `Tu rutina actual («${rutinaActual}») seguirá activa. Solo se moverá a tus rutinas anteriores si decides activar la nueva.`
            : "Primero verás un borrador. Tú decides si lo activas o solo lo guardas."}
        </Text>
      </View>

      <BotonPrimario
        titulo="Generar vista previa"
        deshabilitado={!objetivo || !nivel}
        onPress={() => {
          if (objetivo && nivel) onConfirmar({ objetivo, nivel });
        }}
        icono={
          <Ionicons name="sparkles" size={20} color={palette.background} />
        }
      />
      <Pressable
        accessibilityRole="button"
        onPress={onCerrar}
        className="mt-2 min-h-12 items-center justify-center rounded-xl"
      >
        <Text className="text-base font-semibold text-text-secondary">
          Cancelar
        </Text>
      </Pressable>
    </HojaInferior>
  );
}
