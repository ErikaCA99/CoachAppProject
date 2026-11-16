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

/**
 * Formulario de registro (pantalla RegisterScreen). Incluye la confirmación
 * de contraseña, que es solo de UI y no se envía a Firebase.
 */
export const registroFormSchema = z
  .object({
    nombre: z.string().trim().min(1, "Ingresa tu nombre").max(100),
    apellidos: z.string().trim().min(1, "Ingresa tu apellido").max(100),
    correo: z.string().trim().email("Correo electrónico inválido"),
    contrasena: z.string().min(6, "Mínimo 6 caracteres"),
    confirmarContrasena: z.string(),
  })
  .refine((d) => d.contrasena === d.confirmarContrasena, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarContrasena"],
  });

export type RegistroFormInput = z.infer<typeof registroFormSchema>;
