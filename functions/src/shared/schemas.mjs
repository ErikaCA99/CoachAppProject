import { z } from "zod";

// Identificador de documento de Firestore (sin "/").
export const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[^/]+$/);
