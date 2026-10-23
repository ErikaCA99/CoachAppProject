import { View } from "react-native";

import {
  progresoEjercicio,
  type SesionEntrenamiento,
} from "@/utils/workoutSession";

interface BarraProgresoEjerciciosProps {
  sesion: SesionEntrenamiento;
}

/** Una barra por ejercicio del día; se llena con las series completadas. */
export function BarraProgresoEjercicios({
  sesion,
}: BarraProgresoEjerciciosProps) {
  const total = sesion.ejercicios.length;
  const actual = Math.min(sesion.indice + 1, total);

  return (
    <View
      className="flex-row gap-1.5"
      accessibilityRole="progressbar"
      accessibilityLabel={`Ejercicio ${actual} de ${total}`}
    >
      {sesion.ejercicios.map((_, indice) => (
        <View
          // Los ejercicios no tienen id propio: el orden dentro del día es estable.
          key={indice}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-light"
        >
          <View
            className="h-full bg-primary"
            style={{
              width: `${Math.round(progresoEjercicio(sesion, indice) * 100)}%`,
            }}
          />
        </View>
      ))}
    </View>
  );
}
