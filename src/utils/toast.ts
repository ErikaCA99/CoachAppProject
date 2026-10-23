import { useToastStore } from "@/store/toast.store";
import type { ResultadoAccion } from "@/types/actionResult";

/**
 * Avisos breves y no bloqueantes (reemplazan a `Alert.alert` para confirmar
 * que algo salió bien o avisar que algo falló). Se pueden llamar desde
 * cualquier lugar, también fuera de componentes.
 *
 * Los diálogos de confirmación (eliminar, cerrar sesión, salir) siguen
 * usando `Alert.alert`: ahí sí hay que detener al usuario y que decida.
 * Un `Modal` nativo tapa los avisos: dentro de uno, usa un error en línea.
 */
export const toast = {
  exito: (mensaje: string) =>
    useToastStore.getState().mostrar("exito", mensaje),
  error: (mensaje: string) =>
    useToastStore.getState().mostrar("error", mensaje),
  info: (mensaje: string) => useToastStore.getState().mostrar("info", mensaje),

  /** Muestra el error de una acción que falló; no hace nada si salió bien. */
  desdeResultado: (resultado: ResultadoAccion) => {
    if (!resultado.ok)
      useToastStore.getState().mostrar("error", resultado.mensaje);
  },
};
