import { mensajeDeErrorAuth } from "@/core/errors/mapError";
import {
  cerrarSesionFirebase,
  enviarCorreoRecuperacion,
  iniciarSesionConCorreo,
  iniciarSesionConTokenGoogle,
  observarUsuarioFirebase,
  registrarConCorreo,
  usuarioFirebaseActual,
  type UsuarioFirebase,
} from "@/core/firebase/authService";
import {
  actualizarUsuarioSchema,
  datosOnboardingSchema,
  type DatosOnboardingInput,
  type GeneroUsuario,
  type Usuario,
} from "@/features/profile";
import {
  actualizarPerfilUsuario,
  crearPerfilUsuario,
  eliminarPerfilUsuario,
  obtenerPerfilUsuario,
  observarPerfilUsuario,
} from "@/features/profile/model/repositories/userRepository";

export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  genero?: GeneroUsuario;
  correo: string;
  contrasena: string;
}

/** Datos de la sesión que se guardan en el store (los valida `userSchema`). */
export interface UsuarioSesion {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

function aUsuarioSesion(usuario: UsuarioFirebase): UsuarioSesion {
  return {
    uid: usuario.uid,
    email: usuario.email,
    displayName: usuario.displayName,
    photoURL: usuario.photoURL,
    emailVerified: usuario.emailVerified,
  };
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
    const usuario = await registrarConCorreo(datos.correo, datos.contrasena);
    const uid = usuario.uid;

    await crearPerfilUsuario(uid, {
      nombre: datos.nombre,
      apellidos: datos.apellidos,
      genero: datos.genero,
      email: datos.correo,
    });

    return uid;
  },

  /**
   * Inicia sesión en Firebase con el idToken de Google y crea el perfil en
   * Firestore si es el primer acceso. Devuelve los datos de la sesión.
   */
  async iniciarSesionConGoogle(idToken: string): Promise<UsuarioSesion> {
    const user = await iniciarSesionConTokenGoogle(idToken);
    await AuthController.asegurarPerfil(user.uid, {
      nombre: user.displayName,
      email: user.email,
    });
    return aUsuarioSesion(user);
  },

  async cerrarSesion(): Promise<void> {
    await cerrarSesionFirebase();
  },

  /** Suscripción a los cambios de sesión (login, logout, token expirado). */
  observarSesion(callback: (usuario: UsuarioSesion | null) => void) {
    return observarUsuarioFirebase((usuario) =>
      callback(usuario ? aUsuarioSesion(usuario) : null),
    );
  },

  async iniciarSesion(correo: string, contrasena: string): Promise<void> {
    await iniciarSesionConCorreo(correo.trim(), contrasena);
  },

  /** Envía el correo de restablecimiento de contraseña de Firebase Auth. */
  async recuperarContrasena(correo: string): Promise<void> {
    await enviarCorreoRecuperacion(correo.trim());
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

  /**
   * Guarda lo recogido en el onboarding (objetivo, nivel y datos físicos)
   * en `usuarios/{uid}`. Edad, altura, peso y días disponibles son las
   * entradas del modelo de rutinas con IA (ver `src/features/routines/model/ai/features.ts`).
   */
  async guardarDatosOnboarding(
    uid: string,
    datos: DatosOnboardingInput,
  ): Promise<void> {
    const resultado = datosOnboardingSchema.safeParse(datos);
    if (!resultado.success) {
      throw new Error(
        `Datos de onboarding inválidos: ${resultado.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    // Cuentas creadas en Auth cuyo perfil nunca llegó a Firestore (p. ej.
    // registradas mientras las reglas estaban vencidas) llegan aquí sin
    // `usuarios/{uid}`. Un update sobre un doc inexistente sería un create
    // sin `nombre`/`creadoEn` y las reglas lo rechazarían: primero se
    // garantiza el perfil base.
    const actual = usuarioFirebaseActual();
    await AuthController.asegurarPerfil(uid, {
      nombre: actual?.displayName ?? null,
      email: actual?.email ?? null,
    });
    await actualizarPerfilUsuario(uid, resultado.data);
  },

  /** Traduce los códigos de error de Firebase Auth a un mensaje para la UI. */
  mensajeDeError(error: unknown): string {
    return mensajeDeErrorAuth(error);
  },

  /** Elimina el perfil del usuario de Firestore. */
  async eliminarPerfil(uid: string): Promise<void> {
    await eliminarPerfilUsuario(uid);
  },
};
