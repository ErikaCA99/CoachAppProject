import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";

import { palette } from "@/constants/palette";

type NombreIcono = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Ícono por palabra clave de la categoría (ya normalizada). Se busca por
 * inclusión para cubrir nombres compuestos como "Piernas y glúteos".
 */
const ICONOS_POR_CATEGORIA: [string, NombreIcono][] = [
  ["pecho", "weight-lifter"],
  ["espalda", "rowing"],
  ["pierna", "run"],
  ["gluteo", "human-male"],
  ["hombro", "human-handsup"],
  ["brazo", "arm-flex"],
  ["bicep", "arm-flex"],
  ["tricep", "arm-flex-outline"],
  ["abdom", "yoga"],
  ["core", "yoga"],
  ["cardio", "heart-pulse"],
];

function iconoDeCategoria(categoria: string): NombreIcono {
  const clave = categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    ICONOS_POR_CATEGORIA.find(([palabra]) => clave.includes(palabra))?.[1] ??
    "dumbbell"
  );
}

interface IconoGrupoMuscularProps {
  categoria: string;
  tamano?: "sm" | "md";
}

/** Ícono decorativo del grupo muscular (Pecho, Espalda, Piernas...). */
export function IconoGrupoMuscular({
  categoria,
  tamano = "md",
}: IconoGrupoMuscularProps) {
  const lado = tamano === "sm" ? 28 : 34;
  return (
    <View
      className="items-center justify-center rounded-lg bg-primary-light/40"
      style={{ width: lado, height: lado }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons
        name={iconoDeCategoria(categoria)}
        size={tamano === "sm" ? 16 : 19}
        color={palette.primaryDark}
      />
    </View>
  );
}
