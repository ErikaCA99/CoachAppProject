import { View } from "react-native";

import { Text } from "@/components/ui/Typography";

interface TarjetaDatoProps {
  valor: string;
  etiqueta: string;
  /** Clase de color del valor (por defecto `text-foreground`). */
  colorValor?: string;
  /** Clase de color de la etiqueta (por defecto `text-text-secondary`). */
  colorEtiqueta?: string;
  /** La etiqueta en negrita (p. ej. la categoría del IMC). */
  etiquetaDestacada?: boolean;
}

/** Dato numérico con su etiqueta, en una tarjeta con borde (fila de 2-3 en Progreso). */
export function TarjetaDato({
  valor,
  etiqueta,
  colorValor = "text-foreground",
  colorEtiqueta = "text-text-secondary",
  etiquetaDestacada = false,
}: TarjetaDatoProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}`}
      className="flex-1 items-center rounded-2xl border border-border p-4"
    >
      <Text className={`text-xl font-bold ${colorValor}`}>{valor}</Text>
      <Text
        className={`mt-1 text-center text-sm ${etiquetaDestacada ? "font-semibold" : ""} ${colorEtiqueta}`}
      >
        {etiqueta}
      </Text>
    </View>
  );
}
