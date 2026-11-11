import { camposPropios } from "@/core/validation/persisted.schema";
import { marcarEntrenamientoSchema } from "@/features/workout/model/schemas/workout.schema";

export const entrenamientoPersistidoSchema =
  marcarEntrenamientoSchema.extend(camposPropios);
