import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { MaquinasController } from "@/controllers/MachinesController";
import type { EjercicioRutina } from "@/models/entities/Routine";

/**
 * Abre la ficha de la máquina de un ejercicio de rutina. Si el ejercicio no
 * usa ninguna máquina del catálogo (p. ej. peso libre) avisa al usuario.
 * Lo comparten las pantallas de Rutinas y Progreso.
 */
export function useIrAMaquina() {
  const router = useRouter();

  return useCallback(
    async (ejercicio: EjercicioRutina) => {
      try {
        const id =
          await MaquinasController.resolverMaquinaIdDeEjercicio(ejercicio);
        if (id) {
          router.push({ pathname: "/(app)/machines/[id]", params: { id } });
        } else {
          Alert.alert(
            ejercicio.nombre,
            "Este ejercicio no usa ninguna máquina del catálogo (por ejemplo, es con peso libre).",
          );
        }
      } catch (error) {
        console.error("Error al buscar la máquina del ejercicio:", error);
        Alert.alert("Error", "No se pudo abrir la ficha de la máquina.");
      }
    },
    [router],
  );
}
