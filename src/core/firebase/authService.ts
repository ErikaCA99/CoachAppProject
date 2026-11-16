import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "@firebase/auth";

import { auth } from "@/core/firebase/firebase";

/**
 * Único punto de la app que usa el SDK de Firebase Authentication. Los
 * controladores trabajan con estas funciones y nunca importan `@firebase/auth`.
 */
export type UsuarioFirebase = User;

export async function registrarConCorreo(
  correo: string,
  contrasena: string,
): Promise<UsuarioFirebase> {
  const credencial = await createUserWithEmailAndPassword(
    auth,
    correo,
    contrasena,
  );
  return credencial.user;
}

export async function iniciarSesionConCorreo(
  correo: string,
  contrasena: string,
): Promise<void> {
  await signInWithEmailAndPassword(auth, correo, contrasena);
}

/** Inicia sesión con el idToken de Google y devuelve el usuario de Firebase. */
export async function iniciarSesionConTokenGoogle(
  idToken: string,
): Promise<UsuarioFirebase> {
  const credencial = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credencial);
  return user;
}

export async function cerrarSesionFirebase(): Promise<void> {
  await signOut(auth);
}

export function observarUsuarioFirebase(
  callback: (usuario: UsuarioFirebase | null) => void,
) {
  return onAuthStateChanged(auth, callback);
}

export async function enviarCorreoRecuperacion(correo: string): Promise<void> {
  await sendPasswordResetEmail(auth, correo);
}

export function usuarioFirebaseActual(): UsuarioFirebase | null {
  return auth.currentUser;
}
