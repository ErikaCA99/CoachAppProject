import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType } from "react";

import type { CamaraARProps } from "@/services/ar/machineAR.types";

// Una actualización OTA no puede añadir código nativo a un APK antiguo.
export const AR_NATIVA_DISPONIBLE = !!requireOptionalNativeModule("CoachAR");
export const CamaraAR: ComponentType<CamaraARProps> | null =
  AR_NATIVA_DISPONIBLE ? requireNativeView<CamaraARProps>("CoachAR") : null;
