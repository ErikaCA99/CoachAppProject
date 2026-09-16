import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";

import { auth } from "../services/firebase/firebase";
import { useAuthStore } from "../store/auth.store";

/**
 * Listener que sincroniza el estado de Firebase Auth con el store de Zustand.
 * Se debe llamar UNA sola vez en el layout raíz.
 *
 * Cuando Firebase detecta un cambio de sesión (login, logout, token expirado),
 * actualiza el store. Esto es la fuente de verdad de sesión "reactiva".
 */
export function useAuthListener(): void {
  const { setUser, logout, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // setUser valida internamente con Zod antes de guardar
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        logout();
      }
      setLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
