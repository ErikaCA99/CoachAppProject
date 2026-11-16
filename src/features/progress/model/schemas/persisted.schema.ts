import { z } from "zod";

import { camposPropios } from "@/core/validation/persisted.schema";
import { registrarProgresoSchema } from "@/features/progress/model/schemas/progress.schema";

export const progresoPersistidoSchema = registrarProgresoSchema.extend({
  ...camposPropios,
  imc: z.number().positive().max(2000).optional(),
});
