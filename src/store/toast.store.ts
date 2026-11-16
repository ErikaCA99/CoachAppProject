import { create } from "zustand";

export type TipoAviso = "exito" | "error" | "info";

export interface OpcionesAviso {
  duracionMs?: number;
  accion?: { etiqueta: string; ejecutar: () => Promise<void> };
}

export interface Aviso extends OpcionesAviso {
  /** Cambia con cada aviso: reinicia el temporizador aunque el texto se repita. */
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

interface EstadoAvisos {
  aviso: Aviso | null;
  mostrar: (tipo: TipoAviso, mensaje: string, opciones?: OpcionesAviso) => void;
  ocultar: () => void;
}

let contador = 0;

/** Un solo aviso a la vez: el nuevo reemplaza al anterior en vez de apilarse. */
export const useToastStore = create<EstadoAvisos>((set) => ({
  aviso: null,
  mostrar: (tipo, mensaje, opciones) =>
    set({ aviso: { id: ++contador, tipo, mensaje, ...opciones } }),
  ocultar: () => set({ aviso: null }),
}));
