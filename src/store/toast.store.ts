import { create } from "zustand";

export type TipoAviso = "exito" | "error" | "info";

export interface Aviso {
  /** Cambia con cada aviso: reinicia el temporizador aunque el texto se repita. */
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

interface EstadoAvisos {
  aviso: Aviso | null;
  mostrar: (tipo: TipoAviso, mensaje: string) => void;
  ocultar: () => void;
}

let contador = 0;

/** Un solo aviso a la vez: el nuevo reemplaza al anterior en vez de apilarse. */
export const useToastStore = create<EstadoAvisos>((set) => ({
  aviso: null,
  mostrar: (tipo, mensaje) => set({ aviso: { id: ++contador, tipo, mensaje } }),
  ocultar: () => set({ aviso: null }),
}));
