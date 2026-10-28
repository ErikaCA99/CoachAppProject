import { View } from "react-native";

import { ChipFiltro } from "@/components/machines/FilterChip";
import { HojaInferior } from "@/components/ui/BottomSheet";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Typography";
import { TIPOS_MAQUINA, type TipoMaquina } from "@/models/entities/Machine";

const TIPOS = Object.entries(TIPOS_MAQUINA) as [
  TipoMaquina,
  (typeof TIPOS_MAQUINA)[TipoMaquina],
][];

interface HojaFiltrosProps {
  visible: boolean;
  tipo: TipoMaquina | undefined;
  onCambiarTipo: (tipo: TipoMaquina | undefined) => void;
  onCerrar: () => void;
}

/**
 * Hoja de filtros secundarios del catálogo (hoy solo «Tipo»). El grupo
 * muscular, que es el filtro principal, vive en la fila de chips de la
 * pantalla para no obligar a abrir la hoja.
 */
export function HojaFiltros({
  visible,
  tipo,
  onCambiarTipo,
  onCerrar,
}: HojaFiltrosProps) {
  return (
    <HojaInferior
      visible={visible}
      onCerrar={onCerrar}
      titulo="Filtros"
      etiquetaCerrar="Cerrar filtros"
    >
      <Text className="mb-2 text-sm font-bold uppercase tracking-wider text-text-secondary">
        Tipo de máquina
      </Text>
      <View className="flex-row flex-wrap">
        <ChipFiltro
          texto="Todos"
          activo={!tipo}
          onPress={() => onCambiarTipo(undefined)}
        />
        {TIPOS.map(([valor, info]) => (
          <ChipFiltro
            key={valor}
            texto={info.etiqueta}
            activo={tipo === valor}
            onPress={() => onCambiarTipo(tipo === valor ? undefined : valor)}
          />
        ))}
      </View>

      <View className="mt-6">
        <BotonPrimario titulo="Listo" onPress={onCerrar} />
      </View>
    </HojaInferior>
  );
}
