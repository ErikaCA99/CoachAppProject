import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StatusBar, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { Text } from "@/components/ui/Typography";
import { useReducirMovimiento } from "@/hooks/useReducedMotion";
import { avanzarHaciaCien, porcentajeSimulado } from "@/utils/loadingProgress";

/**
 * Pantalla de carga de "Generando rutina": una mancuerna que sube y baja
 * dentro de un marco de escaneo, con porcentaje de avance.
 *
 * - El porcentaje es simulado (la generación es una sola promesa, no reporta
 *   avance): sube hasta ~92 % mientras se espera y llega a 100 % cuando
 *   `terminado` pasa a true; entonces llama a `onTerminar` una sola vez.
 * - Respeta "reducir movimiento" del sistema: sin bucles de animación.
 * - Usa colores propios (fondo oscuro con verde lima) distintos de la paleta
 *   clara del resto de la app, por eso no usa `palette`.
 */

const LIMA = "#b8ff2e";
const FONDO = ["#0e1d14", "#0f1512", "#0a0d0b"] as const;

// Lienzo SVG (coordenadas del dibujo) — 1:1 con los píxeles.
const ANCHO = 260;
const ALTO = 240;
const CX = ANCHO / 2;
const CY = ALTO / 2;

// Marco de escaneo: esquinas con brazo de 28.
const MARCO = { izq: 39, der: 221, arr: 29, aba: 211, brazo: 28 };
const RUTA_ESQUINAS = [
  `M${MARCO.izq},${MARCO.arr + MARCO.brazo} V${MARCO.arr} H${MARCO.izq + MARCO.brazo}`,
  `M${MARCO.der - MARCO.brazo},${MARCO.arr} H${MARCO.der} V${MARCO.arr + MARCO.brazo}`,
  `M${MARCO.der},${MARCO.aba - MARCO.brazo} V${MARCO.aba} H${MARCO.der - MARCO.brazo}`,
  `M${MARCO.izq + MARCO.brazo},${MARCO.aba} H${MARCO.izq} V${MARCO.aba - MARCO.brazo}`,
].join(" ");

/** Placas de un lado (x, ancho, alto); el otro lado se espeja respecto a CX. */
const PLACAS = [
  { x: 215, ancho: 26, alto: 106, relleno: "placaExterior" },
  { x: 203, ancho: 17, alto: 80, relleno: "placaMedia" },
  { x: 192, ancho: 16, alto: 54, relleno: "placaInterior" },
] as const;

interface Props {
  /** true cuando la rutina ya se guardó: el porcentaje corre hasta 100. */
  terminado?: boolean;
  /** Se llama una vez, al mostrar 100 %. Aquí se navega a la siguiente pantalla. */
  onTerminar?: () => void;
  titulo?: string;
}

function crearBucle(
  valor: Animated.Value,
  duracion: number,
  opciones: { vaiven: boolean; easing?: (t: number) => number },
) {
  const easing = opciones.easing ?? Easing.inOut(Easing.quad);
  const ida = Animated.timing(valor, {
    toValue: 1,
    duration: duracion,
    easing,
    useNativeDriver: true,
  });
  const vuelta = opciones.vaiven
    ? Animated.timing(valor, {
        toValue: 0,
        duration: duracion,
        easing,
        useNativeDriver: true,
      })
    : Animated.timing(valor, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      });
  return Animated.loop(Animated.sequence([ida, vuelta]));
}

export function RoutineGeneratingLoader({
  terminado = false,
  onTerminar,
  titulo = "Generando rutina",
}: Props) {
  const [porcentaje, setPorcentaje] = useState(0);
  const reducirMovimiento = useReducirMovimiento();
  const [anim] = useState(() => ({
    levantar: new Animated.Value(0),
    pulso: new Animated.Value(0),
    giro: new Animated.Value(0),
    barrido: new Animated.Value(0),
  }));
  const avisoEnviado = useRef(false);

  // Porcentaje: simulado mientras se espera, hacia 100 al terminar.
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => {
      setPorcentaje((actual) =>
        terminado
          ? avanzarHaciaCien(actual)
          : Math.max(actual, porcentajeSimulado(Date.now() - inicio)),
      );
    }, 80);
    return () => clearInterval(id);
  }, [terminado]);

  // Aviso único al llegar a 100 %, con una pausa corta para que se vea.
  useEffect(() => {
    if (porcentaje < 100 || avisoEnviado.current) return;
    const id = setTimeout(() => {
      if (avisoEnviado.current) return;
      avisoEnviado.current = true;
      onTerminar?.();
    }, 250);
    return () => clearTimeout(id);
  }, [porcentaje, onTerminar]);

  // Bucles de animación (todos con driver nativo).
  useEffect(() => {
    if (reducirMovimiento) {
      Object.values(anim).forEach((valor) => valor.setValue(0));
      return;
    }
    const bucles = [
      crearBucle(anim.levantar, 1100, { vaiven: true }),
      crearBucle(anim.pulso, 1200, { vaiven: true }),
      crearBucle(anim.giro, 18000, { vaiven: false, easing: Easing.linear }),
      crearBucle(anim.barrido, 2400, { vaiven: true }),
    ];
    bucles.forEach((bucle) => bucle.start());
    return () => bucles.forEach((bucle) => bucle.stop());
  }, [anim, reducirMovimiento]);

  const alto = MARCO.aba - MARCO.arr - 16;

  return (
    <LinearGradient colors={FONDO} style={styles.fondo}>
      <StatusBar barStyle="light-content" backgroundColor={FONDO[2]} />
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={titulo}
        style={styles.centro}
      >
        <View style={styles.lienzo}>
          {/* Resplandor de fondo (estático) */}
          <Svg width={ANCHO} height={ALTO} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="resplandor" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={LIMA} stopOpacity={0.2} />
                <Stop offset="1" stopColor={LIMA} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={CX} cy={CY} r={118} fill="url(#resplandor)" />
          </Svg>

          {/* Anillo punteado que gira despacio */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  {
                    rotate: anim.giro.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={ANCHO} height={ALTO}>
              <Circle
                cx={CX}
                cy={CY}
                r={108}
                fill="none"
                stroke={LIMA}
                strokeOpacity={0.28}
                strokeWidth={1.5}
                strokeDasharray="2 9"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>

          {/* Marco de escaneo con pulso */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: anim.pulso.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
                transform: [
                  {
                    scale: anim.pulso.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1.03],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={ANCHO} height={ALTO}>
              {/* Brillo: el mismo trazo, ancho y translúcido */}
              <Path
                d={RUTA_ESQUINAS}
                fill="none"
                stroke={LIMA}
                strokeOpacity={0.2}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={RUTA_ESQUINAS}
                fill="none"
                stroke={LIMA}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={`M${MARCO.izq + 26},${MARCO.aba - 26} H${MARCO.izq + 43}`}
                stroke={LIMA}
                strokeWidth={3}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>

          {/* Línea de escaneo que recorre el marco */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.barrido,
              {
                left: MARCO.izq + 8,
                top: MARCO.arr + 8,
                width: MARCO.der - MARCO.izq - 16,
                opacity: anim.barrido.interpolate({
                  inputRange: [0, 0.1, 0.9, 1],
                  outputRange: [0, 0.55, 0.55, 0],
                }),
                transform: [
                  {
                    translateY: anim.barrido.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, alto],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Mancuerna que sube y baja */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  {
                    translateY: anim.levantar.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={ANCHO} height={ALTO}>
              <Defs>
                <SvgLinearGradient
                  id="placaExterior"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#74c20a" />
                  <Stop offset="1" stopColor="#4a9a00" />
                </SvgLinearGradient>
                <SvgLinearGradient id="placaMedia" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#97dc12" />
                  <Stop offset="1" stopColor="#62b200" />
                </SvgLinearGradient>
                <SvgLinearGradient
                  id="placaInterior"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#bdf33a" />
                  <Stop offset="1" stopColor="#7acb0c" />
                </SvgLinearGradient>
              </Defs>
              {/* Barra */}
              <Rect
                x={CX - 66}
                y={CY - 6}
                width={132}
                height={12}
                rx={6}
                fill="#ffffff"
              />
              {/* Placas: derecha y su espejo a la izquierda */}
              {PLACAS.map((placa) => (
                <Rect
                  key={`d-${placa.relleno}`}
                  x={placa.x}
                  y={CY - placa.alto / 2}
                  width={placa.ancho}
                  height={placa.alto}
                  rx={placa.ancho / 2.2}
                  fill={`url(#${placa.relleno})`}
                />
              ))}
              {PLACAS.map((placa) => (
                <Rect
                  key={`i-${placa.relleno}`}
                  x={ANCHO - placa.x - placa.ancho}
                  y={CY - placa.alto / 2}
                  width={placa.ancho}
                  height={placa.alto}
                  rx={placa.ancho / 2.2}
                  fill={`url(#${placa.relleno})`}
                />
              ))}
            </Svg>
          </Animated.View>
        </View>

        <Text style={styles.porcentaje} importantForAccessibility="no">
          {porcentaje}%
        </Text>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lienzo: { width: ANCHO, height: ALTO },
  barrido: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
    backgroundColor: LIMA,
  },
  porcentaje: {
    marginTop: 20,
    color: LIMA,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  titulo: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
});
