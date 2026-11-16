import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

import { ListaMaquinasAgrupada } from "@/features/machines/view/scanner/GroupedMachineList";
import { TarjetaSeleccionEscaneo } from "@/features/machines/view/scanner/ScanSelectionCard";
import { BotonPrimario } from "@/shared/ui/PrimaryButton";
import { CampoBusqueda } from "@/shared/ui/SearchField";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import { MaquinasController } from "@/features/machines/controller/MachinesController";
import type { Maquina } from "@/features/machines/model/entities/Machine";

interface HojaConfirmacionMaquinaProps {
  catalogo: Maquina[];
  seleccionada: Maquina | null;
  onSeleccionar: (maquina: Maquina) => void;
  /** Confianza (0..1) de la sugerencia del reconocimiento, si la hubo. */
  sugerencia: { maquinaId: string; confianza: number } | null;
  onConfirmar: () => void;
  onReintentar: () => void;
  alturaMaxima: number;
}

/**
 * Hoja inferior del escáner para confirmar la máquina: cabecera con la
 * máquina elegida, buscador, lista agrupada por grupo muscular y acciones
 * con jerarquía clara (Confirmar selección / Reintentar escaneo).
 */
export function HojaConfirmacionMaquina({
  catalogo,
  seleccionada,
  onSeleccionar,
  sugerencia,
  onConfirmar,
  onReintentar,
  alturaMaxima,
}: HojaConfirmacionMaquinaProps) {
  const [busqueda, setBusqueda] = useState("");

  const grupos = useMemo(
    () =>
      MaquinasController.agruparPorCategoria(
        MaquinasController.filtrar(catalogo, { busqueda }),
      ),
    [catalogo, busqueda],
  );

  const buscando = busqueda.trim().length > 0;
  const confianzaSugerencia =
    seleccionada && sugerencia?.maquinaId === seleccionada.id
      ? sugerencia.confianza
      : null;

  return (
    <View
      className="rounded-3xl bg-background px-4 pb-4 pt-2.5"
      style={{ maxHeight: alturaMaxima }}
    >
      <View className="mb-3 h-1 w-10 self-center rounded-full bg-primary-light" />

      <TarjetaSeleccionEscaneo
        maquina={seleccionada}
        confianzaSugerencia={confianzaSugerencia}
      />

      <View className="mb-1 mt-3">
        <CampoBusqueda
          valor={busqueda}
          onCambiar={setBusqueda}
          placeholder="Buscar máquina o músculo"
          etiqueta="Buscar máquina"
        />
      </View>

      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingTop: 4 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        accessibilityRole="radiogroup"
      >
        {grupos.length > 0 ? (
          <ListaMaquinasAgrupada
            grupos={grupos}
            seleccionadaId={seleccionada?.id ?? null}
            onSeleccionar={onSeleccionar}
            expandirTodo={buscando}
          />
        ) : (
          <Text className="py-6 text-center text-sm text-text-muted">
            No hay máquinas que coincidan con “{busqueda.trim()}”.
          </Text>
        )}
      </ScrollView>

      <View className="mt-3">
        <BotonPrimario
          titulo="Confirmar selección"
          onPress={onConfirmar}
          deshabilitado={!seleccionada}
          icono={
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={palette.background}
            />
          }
        />
        <TouchableOpacity
          onPress={onReintentar}
          className="mt-2 min-h-[44px] flex-row items-center justify-center rounded-2xl"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color={palette.primary} />
          <Text className="ml-1.5 text-sm font-bold text-primary">
            Reintentar escaneo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
