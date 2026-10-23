import type { ComponentProps, Ref } from "react";
import {
  StyleSheet,
  Text as TextNativo,
  TextInput as TextInputNativo,
} from "react-native";

import {
  familiaPorPeso,
  pesoDeEstilo,
  separarPesoDeClases,
} from "@/utils/typography";

/**
 * `Text` y `TextInput` de la app: igual que los de React Native pero con
 * Spline Sans (sistema de diseño). Se importan de aquí, no de `react-native`.
 *
 * El peso se toma de la clase de Tailwind (`font-bold`…) o de
 * `style.fontWeight` y se traduce a la familia de ese peso; si la fuente no
 * llegó a cargar, `fontFamily` no encuentra el archivo y Android/iOS usan la
 * fuente del sistema.
 */
function propsTipograficas<P extends { className?: string; style?: unknown }>(
  props: P,
): P {
  const { className, peso: pesoClase } = separarPesoDeClases(props.className);
  const aplanado = StyleSheet.flatten(props.style as never) as
    { fontWeight?: string | number } | undefined;
  const peso = pesoClase ?? pesoDeEstilo(aplanado?.fontWeight) ?? 400;

  return {
    ...props,
    className,
    // Al final: `fontWeight` normal para que no se aplique negrita sintética
    // encima del archivo de la familia ya elegida.
    style: [
      props.style,
      { fontFamily: familiaPorPeso(peso), fontWeight: "normal" },
    ],
  };
}

export function Text(props: ComponentProps<typeof TextNativo>) {
  return <TextNativo {...propsTipograficas(props)} />;
}

/** Tipo de la instancia, para `useRef<TextInputRef>(null)`. */
export type TextInputRef = TextInputNativo;

export function TextInput(
  props: ComponentProps<typeof TextInputNativo> & {
    ref?: Ref<TextInputNativo>;
  },
) {
  return <TextInputNativo {...propsTipograficas(props)} />;
}
