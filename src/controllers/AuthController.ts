import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import type {
  GeneroUsuario,
  NivelExperiencia,
  ObjetivoUsuario,
  Usuario,
} from "@/models/entities/Usuario";
import {
  actualizarPerfilUsuario,
  crearPerfilUsuario,
  eliminarPerfilUsuario,
  obtenerPerfilUsuario,
  observarPerfilUsuario,
} from "@/models/repositories/usuarioRepository";
import {
  actualizarUsuarioSchema,
  objetivoYNivelSchema,
} from "@/schemas/usuario.schema";
import { auth } from "@/services/firebase/firebase";

export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  genero?: GeneroUsuario;
  correo: string;
  contrasena: string;
}

/**
 * Controlador (capa de negocio) para autenticación y perfil de usuario.
 * Las Vistas de `(auth)/` y `(app)/perfil.tsx` solo llaman a este
 * controlador; nunca importan Firebase Auth ni el repositorio directamente.
 *
 * NOTA: no toca el store de Zustand a propósito. `useAuthListener` (montado
 * una sola vez en el layout raíz) sincroniza automáticamente cualquier
 * cambio de sesión de Firebase Auth hacia el store.
 */
export const AuthController = {
  /** Crea la cuenta en Firebase Auth y el perfil inicial en Firestore. Devuelve el uid. */
  async registrar(datos: DatosRegistro): Promise<string> {
    const credencial = await createUserWithEmailAndPassword(
      auth,
      datos.correo,
      datos.contrasena,
    );
    const uid = credencial.user.uid;

    await crearPerfilUsuario(uid, {
      nombre: datos.nombre,
      apellidos: datos.apellidos,
      genero: datos.genero,
      email: datos.correo,
    });

    return uid;
  },

  async iniciarSesion(correo: string, contrasena: string): Promise<void> {
    await signInWithEmailAndPassword(auth, correo.trim(), contrasena);
  },

  /** Envía el correo de restablecimiento de contraseña de Firebase Auth. */
  async recuperarContrasena(correo: string): Promise<void> {
    await sendPasswordResetEmail(auth, correo.trim());
  },

  /**
   * Garantiza que exista `usuarios/{uid}`. Se usa tras el login con Google,
   * donde Firebase Auth crea la cuenta pero nadie crea el perfil en Firestore.
   * No sobrescribe un perfil existente.
   */
  async asegurarPerfil(
    uid: string,
    datos: { nombre: string | null; email: string | null },
  ): Promise<void> {
    const existente = await obtenerPerfilUsuario(uid);
    if (existente) return;

    const [nombre, ...resto] = (datos.nombre ?? "").trim().split(/\s+/);
    await crearPerfilUsuario(uid, {
      nombre: nombre || "Usuario",
      apellidos: resto.length ? resto.join(" ") : undefined,
      email: datos.email ?? "",
    });
  },

  /**
   * Regla de negocio del onboarding: el perfil está completo cuando ya tiene
   * objetivo y nivel de experiencia (lo mínimo para generar una rutina).
   */
  esPerfilCompleto(perfil: Usuario | null): boolean {
    return !!perfil?.objetivo && !!perfil?.nivel;
  },

  async obtenerPerfil(uid: string): Promise<Usuario | null> {
    return obtenerPerfilUsuario(uid);
  },

  async actualizarPerfil(
    uid: string,
    datos: Partial<Omit<Usuario, "id">>,
  ): Promise<void> {
    const resultado = actualizarUsuarioSchema.safeParse(datos);
    if (!resultado.success) {
      throw new Error(
        `Datos de perfil inválidos: ${resultado.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    await actualizarPerfilUsuario(uid, resultado.data);
  },

  /** Suscripción en tiempo real al perfil (para reflejar cambios como la rutina activa). */
  observarPerfil(
    uid: string,
    callback: (usuario: Usuario | null) => void,
    onError?: (error: Error) => void,
  ) {
    return observarPerfilUsuario(uid, callback, onError);
  },

  /** Guarda el objetivo y nivel elegidos en el onboarding posterior al registro. */
  async guardarObjetivoYNivel(
    uid: string,
    objetivo: ObjetivoUsuario,
    nivel: NivelExperiencia,
  ): Promise<void> {
    const resultado = objetivoYNivelSchema.safeParse({ objetivo, nivel });
    if (!resultado.success) {
      throw new Error(
        `Datos de objetivo/nivel inválidos: ${resultado.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    await actualizarPerfilUsuario(uid, resultado.data);
  },

  /** Traduce los códigos de error de Firebase Auth a un mensaje para la UI. */
  mensajeDeError(error: unknown): string {
    const codigo =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    switch (codigo) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Correo o contraseña incorrectos";
      case "auth/invalid-email":
        return "Correo electrónico inválido";
      case "auth/email-already-in-use":
        return "Este correo ya está registrado";
      case "auth/weak-password":
        return "La contraseña debe tener al menos 6 caracteres";
      case "auth/too-many-requests":
        return "Demasiados intentos. Intenta más tarde";
      case "auth/network-request-failed":
        return "Sin conexión. Revisa tu internet";
      default:
        return "Ocurrió un error inesperado. Intenta nuevamente";
    }
  },

  /** Elimina el perfil del usuario de Firestore. */
  async eliminarPerfil(uid: string): Promise<void> {
    await eliminarPerfilUsuario(uid);
  },
};
