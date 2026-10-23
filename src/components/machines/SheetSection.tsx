import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

type Variante = "normal" | "alerta" | "error";

const ESTILOS: Record<Variante, { contenedor: string; icono: string }> = {
  normal: {
    contenedor: "border-primary-light/70 bg-background",
    icono: palette.primary,
  },
  alerta: {
    contenedor: "border-secondary bg-secondary/20",
    icono: palette.accentStrong,
  },
  error: {
    contenedor: "border-accent/60 bg-accent/10",
    icono: palette.accentStrong,
  },
};

interface SeccionFichaProps {
  titulo: string;
  icono: React.ComponentProps<typeof Ionicons>["name"];
  variante?: Variante;
  children: ReactNode;
  plegable?: boolean;
}

/** Tarjeta de sección de la ficha de una máquina (Descripción, Músculos...). */
export function SeccionFicha({
  titulo,
  icono,
  variante = "normal",
  children,
  plegable = false,
}: SeccionFichaProps) {
  const estilo = ESTILOS[variante];
  const [expandida, setExpandida] = useState(false);
  const abierta = !plegable || expandida;
  return (
    <View className={`mb-4 rounded-2xl border p-4 ${estilo.contenedor}`}>
      <Pressable
        disabled={!plegable}
        onPress={() => setExpandida((valor) => !valor)}
        accessibilityRole={plegable ? "button" : "header"}
        accessibilityState={plegable ? { expanded: abierta } : undefined}
        accessibilityLabel={titulo}
        style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
        className="min-h-12 flex-row items-center"
      >
        <Ionicons
          name={icono}
          size={20}
          color={estilo.icono}
          accessible={false}
        />
        <Text className="ml-2 flex-1 text-base font-bold text-foreground">
          {titulo}
        </Text>
        {plegable && (
          <Ionicons
            name={abierta ? "chevron-up" : "chevron-down"}
            size={20}
            color={palette.primary}
            accessible={false}
          />
        )}
      </Pressable>
      {abierta && <View className="mt-2">{children}</View>}
    </View>
  );
}

interface ListaPuntosProps {
  puntos: string[];
  icono: React.ComponentProps<typeof Ionicons>["name"];
  colorIcono: string;
}

export function ListaPuntos({ puntos, icono, colorIcono }: ListaPuntosProps) {
  return (
    <View>
      {puntos.map((punto, indice) => (
        <View key={indice} className="mb-2 flex-row">
          <Ionicons
            name={icono}
            size={15}
            color={colorIcono}
            style={{ marginTop: 2 }}
          />
          <Text className="ml-2 flex-1 text-sm leading-6 text-text-secondary">
            {punto}
          </Text>
        </View>
      ))}
    </View>
  );
}
