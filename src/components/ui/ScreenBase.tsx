import type { ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PantallaBaseProps {
  /** Encabezado fijo (normalmente un `AppHeader`): no se desplaza con el contenido. */
  encabezado?: ReactNode;
  /** Barra inferior fija (p. ej. la acción principal de la pantalla). */
  pie?: ReactNode;
  /** Ajustes del `ScrollView` (p. ej. `refreshControl`). */
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children">;
  /** Espacio extra bajo el contenido (por defecto 32). */
  espacioInferior?: number;
  /**
   * `false` para pantallas cuyo contenido es una lista virtualizada
   * (`FlatList`): los hijos se montan sin `ScrollView` y gestionan su propio
   * scroll y márgenes.
   */
  conScroll?: boolean;
  children: ReactNode;
}

/**
 * Estructura común de las pantallas principales: fondo blanco, margen
 * lateral de 20, encabezado fijo bajo la barra de estado y contenido con
 * scroll. Centraliza lo que antes cada pantalla armaba por su cuenta
 * (`insets.top + 16/24`, `padding: 20`, fondos distintos).
 */
export function PantallaBase({
  encabezado,
  pie,
  scrollProps,
  espacioInferior = 32,
  conScroll = true,
  children,
}: PantallaBaseProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {encabezado ? <View className="px-5 pt-4">{encabezado}</View> : null}
      {conScroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: encabezado ? 0 : 16,
            paddingBottom: espacioInferior,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1">{children}</View>
      )}
      {pie}
    </View>
  );
}
