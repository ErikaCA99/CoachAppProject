import { z } from "zod";

import { camposPersistidos } from "@/core/validation/persisted.schema";
import { crearUsuarioSchema } from "@/features/profile/model/schemas/user.schema";

export const perfilPersistidoSchema = crearUsuarioSchema.extend({
  ...camposPersistidos,
  rutinaActivaId: z.string().max(128).nullable().optional(),
});
