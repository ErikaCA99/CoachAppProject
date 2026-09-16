import { z } from "zod";

/**
 * Schema que valida los datos del usuario de Firebase antes de guardarlo
 * en el store de Zustand. photoURL y email pueden ser null porque Firebase
 * no los garantiza en todos los proveedores.
 */
export const userSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  emailVerified: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Schema que valida la respuesta de Google Sign-In.
 * Se usa internamente en el hook para asegurar que el idToken existe
 * antes de enviarlo a Firebase.
 */
export const googleSignInResultSchema = z.object({
  idToken: z.string().min(1),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    photo: z.string().url().nullable(),
  }),
});

export type GoogleSignInResult = z.infer<typeof googleSignInResultSchema>;
