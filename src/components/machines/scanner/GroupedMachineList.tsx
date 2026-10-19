import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { IconoGrupoMuscular } from "@/components/machines/scanner/MuscleGroupIcon";
import { palette } from "@/constants/palette";
import type { GrupoMaquinas } from "@/controllers/MachinesController";
import { TIPOS_MAQUINA, type Maquina } from "@/models/entities/Machine";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface ListaMaquinasAgrupadaProps {
  grupos: GrupoMaquinas[];
  seleccionadaId: string | null;
  onSeleccionar: (maquina: Maquina) => void;
  /** Filas visibles por grupo antes del desplegable "Más...". */
  visiblesPorGrupo?: number;
  /** Muestra todos los resultados (p. ej. mientras se busca). */
  expandirTodo?: boolean;
}

function FilaMaquina({
  maquina,
  seleccionada,
  onPress,
}: {
  maquina: Maquina;
  seleccionada: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`min-h-[46px] flex-row items-center rounded-xl px-2.5 ${
        seleccionada ? "bg-primary-light/35" : ""
      }`}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`${maquina.nombre}, ${TIPOS_MAQUINA[maquina.tipo].etiqueta}`}
    >
      <Ionicons
        name={TIPOS_MAQUINA[maquina.tipo].icono as IoniconName}
        size={16}
        color={seleccionada ? palette.primaryDark : palette.textMuted}
      />
      <Text
        className={`ml-3 flex-1 text-[13px] ${
          seleccionada
            ? "font-bold text-foreground"
            : "font-medium text-text-secondary"
        }`}
        numberOfLines={2}
      >
        {maquina.nombre}
      </Text>
      <Ionicons
        name={seleccionada ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={seleccionada ? palette.primary : palette.primaryLight}
      />
    </TouchableOpacity>
  );
}

/**
 * Lista de máquinas agrupada por grupo muscular. Cada grupo muestra pocas
 * filas y el resto queda tras un desplegable "Más..." para no saturar la hoja.
 */
export function ListaMaquinasAgrupada({
  grupos,
  seleccionadaId,
  onSeleccionar,
  visiblesPorGrupo = 3,
  expandirTodo = false,
}: ListaMaquinasAgrupadaProps) {
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const alternar = (categoria: string) =>
    setExpandidos((prev) => ({ ...prev, [categoria]: !prev[categoria] }));

  return (
    <View>
      {grupos.map(({ categoria, maquinas }) => {
        const abierto = expandirTodo || expandidos[categoria] === true;
        // La máquina elegida siempre queda visible aunque el grupo esté plegado.
        const visibles = abierto
          ? maquinas
          : maquinas.filter(
              (m, i) => i < visiblesPorGrupo || m.id === seleccionadaId,
            );
        const ocultas = maquinas.length - visibles.length;

        return (
          <View key={categoria} className="mb-2">
            <View
              className="flex-row items-center px-1 py-1.5"
              accessibilityRole="header"
            >
              <IconoGrupoMuscular categoria={categoria} tamano="sm" />
              <Text className="ml-2 flex-1 text-[13px] font-bold text-foreground">
                {categoria}
              </Text>
              <Text className="text-xs font-semibold text-text-muted">
                {maquinas.length}
              </Text>
            </View>

            {visibles.map((maquina) => (
              <FilaMaquina
                key={maquina.id}
                maquina={maquina}
                seleccionada={maquina.id === seleccionadaId}
                onPress={() => onSeleccionar(maquina)}
              />
            ))}

            {!expandirTodo &&
            (ocultas > 0 || abierto) &&
            maquinas.length > visiblesPorGrupo ? (
              <TouchableOpacity
                onPress={() => alternar(categoria)}
                className="min-h-[40px] flex-row items-center self-start px-2.5"
                accessibilityRole="button"
                accessibilityState={{ expanded: abierto }}
                accessibilityLabel={
                  abierto
                    ? `Mostrar menos máquinas de ${categoria}`
                    : `Mostrar ${ocultas} máquinas más de ${categoria}`
                }
              >
                <Text className="text-xs font-bold text-primary">
                  {abierto ? "Menos" : `Más... (${ocultas})`}
                </Text>
                <Ionicons
                  name={abierto ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={palette.primary}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
