import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { EntradaAnimada } from "@/components/ui/AnimatedEntrance";
import { palette } from "@/constants/palette";

type NombreIcono = ComponentProps<typeof Ionicons>["name"];

interface AccionEstadoVacio {
  /** Texto del botón primario de la acción (ej. "Generar rutina"). */
  label: string;
  onPress: () => void;
  /** Ícono opcional a la izquierda del texto. */
  icon?: NombreIcono;
}

interface EmptyStateProps {
  /** Ícono de Ionicons mostrado dentro de la insignia circular. */
  icon: NombreIcono;
  title: string;
  description?: string;
  /** Botón primario opcional para guiar al usuario a la siguiente acción. */
  actionButton?: AccionEstadoVacio;
  /** Reduce el padding vertical para usarse dentro de modales u hojas pequeñas. */
  compact?: boolean;
}

/**
 * Estado vacío genérico y reutilizable: ícono + título + descripción + CTA opcional.
 * Reemplaza los mensajes de texto plano ("0 ejercicios", "Aún no tienes registros")
 * por una presentación visual consistente en toda la app.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionButton,
  compact = false,
}: EmptyStateProps) {
  return (
    <EntradaAnimada>
      <View
        className={`items-center justify-center px-6 ${compact ? "py-6" : "py-12"}`}
      >
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-light/30">
          <Ionicons name={icon} size={30} color={palette.primary} />
        </View>

        <Text className="mt-4 text-center text-base font-bold text-foreground">
          {title}
        </Text>

        {description ? (
          <Text className="mt-1.5 max-w-[280px] text-center text-sm leading-5 text-text-secondary">
            {description}
          </Text>
        ) : null}

        {actionButton ? (
          <TouchableOpacity
            onPress={actionButton.onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={actionButton.label}
            className="mt-5 flex-row items-center gap-2 rounded-2xl bg-primary px-5 py-3"
          >
            {actionButton.icon ? (
              <Ionicons
                name={actionButton.icon}
                size={18}
                color={palette.background}
              />
            ) : null}
            <Text className="text-sm font-bold text-background">
              {actionButton.label}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </EntradaAnimada>
  );
}
