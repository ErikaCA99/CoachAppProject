import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing } from "react-native";

import { useReducirMovimiento } from "@/hooks/useReducedMotion";

/** Entrada breve sin bloquear controles ni alterar el tamaño del contenido. */
export function EntradaAnimada({ children }: { children: ReactNode }) {
  const reducir = useReducirMovimiento();
  const [entrada] = useState(() => new Animated.Value(1));
  const reproducida = useRef(false);

  useEffect(() => {
    if (reducir) {
      entrada.stopAnimation();
      entrada.setValue(1);
      return;
    }
    if (reproducida.current) return;
    reproducida.current = true;
    entrada.setValue(0);
    const animacion = Animated.timing(entrada, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animacion.start();
    return () => {
      animacion.stop();
      entrada.setValue(1);
    };
  }, [entrada, reducir]);

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [
          {
            translateY: entrada.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
