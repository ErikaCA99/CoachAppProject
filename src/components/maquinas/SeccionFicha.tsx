import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

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
}

/** Tarjeta de sección de la ficha de una máquina (Descripción, Músculos...). */
export function SeccionFicha({
  titulo,
  icono,
  variante = "normal",
  children,
}: SeccionFichaProps) {
  const estilo = ESTILOS[variante];
  return (
    <View className={`mb-4 rounded-2xl border p-4 ${estilo.contenedor}`}>
      <View className="mb-3 flex-row items-center">
        <Ionicons name={icono} size={18} color={estilo.icono} />
        <Text className="ml-2 text-base font-bold text-foreground">
          {titulo}
        </Text>
      </View>
      {children}
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
          <Text className="ml-2 flex-1 text-[13px] leading-5 text-text-secondary">
            {punto}
          </Text>
        </View>
      ))}
    </View>
  );
}
