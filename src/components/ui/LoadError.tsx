import { EmptyState } from "@/components/ui/EmptyState";

interface ErrorCargaProps {
  mensaje: string;
  onReintentar: () => void;
  /** Reduce el padding vertical para usarse dentro de una pantalla con encabezado. */
  compact?: boolean;
}

/** Estado de error de carga con botón "Reintentar" (distinto del estado vacío). */
export function ErrorCarga({
  mensaje,
  onReintentar,
  compact,
}: ErrorCargaProps) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="No se pudo cargar"
      description={mensaje}
      actionButton={{
        label: "Reintentar",
        icon: "refresh-outline",
        onPress: onReintentar,
      }}
      compact={compact}
    />
  );
}
