import { useCallback, useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

import { useReducirMovimiento } from "@/hooks/useReducedMotion";

/** Presión y liberación interrumpibles; solo transforma, no recalcula layout. */
export function useAnimacionPresion(inactivo = false) {
  const reducir = useReducirMovimiento();
  const [escala] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducir || inactivo) {
      escala.stopAnimation();
      escala.setValue(1);
    }
    return () => escala.stopAnimation();
  }, [escala, reducir, inactivo]);

  const animar = useCallback(
    (presionado: boolean) => {
      escala.stopAnimation();
      if (reducir || inactivo) {
        escala.setValue(1);
        return;
      }
      Animated.timing(escala, {
        toValue: presionado ? 0.98 : 1,
        duration: presionado ? 90 : 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }).start();
    },
    [escala, reducir, inactivo],
  );

  return {
    estilo: { transform: [{ scale: escala }] },
    onPressIn: () => animar(true),
    onPressOut: () => animar(false),
  };
}
