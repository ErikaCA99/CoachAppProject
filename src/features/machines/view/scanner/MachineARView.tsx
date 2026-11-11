import type { ComponentType } from "react";

import type { CamaraARProps } from "@/features/machines/model/entities/machineAR.types";

/** iOS/web conservan la cámara convencional; este módulo implementa ARCore. */
export const AR_NATIVA_DISPONIBLE = false;
export const CamaraAR: ComponentType<CamaraARProps> | null = null;
