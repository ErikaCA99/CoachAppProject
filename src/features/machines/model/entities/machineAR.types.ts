import type { Ref } from "react";
import type { NativeSyntheticEvent, ViewProps } from "react-native";

export interface CapturaAR {
  uri: string;
  capturaId: string;
}

export interface CamaraARRef {
  capturar(): Promise<CapturaAR>;
  recolocar(): Promise<void>;
}

export interface ObjetivoAR {
  clave: string;
  capturaId: string | null;
  centroX: number | null;
  centroY: number | null;
  nombre: string;
  detalle: string;
}

export interface EstadoAR {
  estado:
    | "buscando"
    | "lista"
    | "colocar"
    | "anclada"
    | "instalando"
    | "noCompatible"
    | "error";
  mensaje: string;
}

export interface CamaraARProps extends ViewProps {
  ref?: Ref<CamaraARRef>;
  activa: boolean;
  objetivo: ObjetivoAR | null;
  onEstado: (evento: NativeSyntheticEvent<EstadoAR>) => void;
}
