import { z } from "zod";

import { camposPropios } from "@/core/validation/persisted.schema";
import {
  registroIMCSchema,
  registroIngestaSchema,
} from "@/features/nutrition/model/schemas/nutrition.schema";

export const nutricionPersistidaSchema = z.union([
  registroIMCSchema.extend(camposPropios),
  registroIngestaSchema.extend(camposPropios),
]);
