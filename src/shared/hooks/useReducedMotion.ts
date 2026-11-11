import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Conservador hasta conocer la preferencia; escucha cambios sin reiniciar la app. */
export function useReducirMovimiento() {
  const [reducir, setReducir] = useState(true);

  useEffect(() => {
    let activo = true;
    let cambioRecibido = false;
    const suscripcion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (valor) => {
        cambioRecibido = true;
        setReducir(valor);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (activo && !cambioRecibido) setReducir(valor);
      })
      .catch(() => {});
    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  return reducir;
}
