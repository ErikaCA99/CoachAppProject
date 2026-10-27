import { useRouter } from "expo-router";
import { useCallback } from "react";

import { MaquinasController } from "@/controllers/MachinesController";
import type { EjercicioRutina } from "@/models/entities/Routine";
import { toast } from "@/utils/toast";

/**
 * Abre la ficha de un ejercicio de rutina: la de su máquina del catálogo y,
 * si no usa ninguna (p. ej. peso libre o peso corporal), la ficha del propio
 * ejercicio con su imagen y descripción.
 * Lo comparten las pantallas de Rutinas, Progreso y Entrenar.
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
          router.push({
            pathname: "/(app)/routines/exercise",
            params: {
              id: String(ejercicio.maquinaId),
              nombre: ejercicio.nombre,
            },
          });
        }
      } catch (error) {
        console.error("Error al buscar la máquina del ejercicio:", error);
        toast.error("No se pudo abrir la ficha del ejercicio.");
      }
    },
    [router],
  );
}
