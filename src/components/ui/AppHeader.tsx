import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { palette } from "@/constants/palette";

type NombreIcono = ComponentProps<typeof Ionicons>["name"];

interface AccionSecundariaHeader {
  icon: NombreIcono;
  /** `accessibilityLabel` del botón (ej. "Escanear una máquina"). */
  label: string;
  onPress: () => void;
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Muestra una flecha de volver a la izquierda en vez del título suelto. */
  onBackPress?: () => void;
  /**
   * Botón redondo alineado a la derecha que lleva a Perfil/Configuración.
   * Reemplaza los FABs de configuración flotantes que se superponían al contenido:
   * cada pantalla principal declara aquí su único punto de acceso al perfil.
   */
  onProfilePress?: () => void;
  /** Acción extra (ej. escanear) renderizada antes del botón de perfil. */
  secondaryAction?: AccionSecundariaHeader;
}

/**
 * Barra superior reutilizable para las pantallas principales de la app
 * autenticada. Centraliza el acceso a Perfil/Configuración a la derecha,
 * liberando el espacio visual de cada vista.
 */
export function AppHeader({
  title,
  subtitle,
  onBackPress,
  onProfilePress,
  secondaryAction,
}: AppHeaderProps) {
  return (
    <View className="mb-6 flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center">
        {onBackPress ? (
          <TouchableOpacity
            onPress={onBackPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-light/30"
          >
            <Ionicons name="arrow-back" size={22} color={palette.foreground} />
          </TouchableOpacity>
        ) : null}

        <View className="flex-1 pr-2">
          <Text
            className="text-[26px] font-bold text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="mt-1 text-sm text-text-secondary"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {secondaryAction || onProfilePress ? (
        <View className="flex-row items-center gap-2.5">
          {secondaryAction ? (
            <TouchableOpacity
              onPress={secondaryAction.onPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={secondaryAction.label}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-strong"
            >
              <Ionicons
                name={secondaryAction.icon}
                size={22}
                color={palette.background}
              />
            </TouchableOpacity>
          ) : null}

          {onProfilePress ? (
            <TouchableOpacity
              onPress={onProfilePress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ir a mi perfil"
              className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            >
              <Ionicons name="person" size={20} color={palette.background} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
