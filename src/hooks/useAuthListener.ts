import { useEffect } from "react";

import { AuthController } from "@/controllers/AuthController";
import { useAuthStore } from "@/store/auth.store";

/**
 * Listener que sincroniza la sesión de Firebase Auth con el store de Zustand.
 * Se debe llamar UNA sola vez en el layout raíz.
 *
 * Cuando Firebase detecta un cambio de sesión (login, logout, token expirado),
 * actualiza el store. Es la fuente de verdad "reactiva" de la sesión.
 */
export function useAuthListener(): void {
  // Las acciones de Zustand son referencias estables: el efecto corre una vez.
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setAuthInicializado = useAuthStore((s) => s.setAuthInicializado);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = AuthController.observarSesion((usuario) => {
      if (usuario) {
        setUser(usuario); // setUser valida con Zod antes de guardar
      } else {
        logout();
      }
      setLoading(false);
      setAuthInicializado(true);
    });

    return unsubscribe;
  }, [setUser, logout, setLoading, setAuthInicializado]);
}
