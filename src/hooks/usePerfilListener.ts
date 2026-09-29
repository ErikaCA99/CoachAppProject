import { useEffect } from "react";

import { AuthController } from "@/controllers/AuthController";
import { useAuthStore } from "@/store/auth.store";

/**
 * Observa en tiempo real `usuarios/{uid}` y mantiene `perfilCompleto` en el
 * store. Es la fuente de verdad que usa el layout raíz para decidir entre
 * `(onboarding)` y `(app)`. Se monta UNA sola vez en `src/app/_layout.tsx`.
 *
 * - Perfil inexistente (p. ej. primer login con Google) → `false`.
 * - Error de lectura (reglas/red) → `false`, para no dejar al usuario
 *   atascado en el login; el onboarding mostrará el error al guardar.
 */
export function usePerfilListener(): void {
  const uid = useAuthStore((s) => s.user?.uid);
  const setPerfilCompleto = useAuthStore((s) => s.setPerfilCompleto);

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = AuthController.observarPerfil(
      uid,
      (perfil) => setPerfilCompleto(AuthController.esPerfilCompleto(perfil)),
      (error) => {
        console.warn("No se pudo leer el perfil:", error.message);
        setPerfilCompleto(false);
      },
    );

    return unsubscribe;
  }, [uid, setPerfilCompleto]);
}
