import type { Timestamp } from "firebase/firestore";

/**
 * Registro puntual de progreso físico (peso corporal a lo largo del tiempo).
 * Corresponde a un documento de `usuarios/{usuarioId}/progresoFisico`.
 * A diferencia de `RegistroNutricional` (una calculadora de IMC bajo demanda),
 * este registro es un checkpoint deliberado para graficar tendencia en el tiempo.
 */
export interface ProgresoFisico {
  usuarioId: string;
  peso: number; // kg
  altura?: number; // cm
  imc?: number;
  notas?: string;
  creadoEn?: Timestamp;
}
