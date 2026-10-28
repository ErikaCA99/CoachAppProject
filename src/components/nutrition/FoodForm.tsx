import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";

import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { CampoFormulario } from "@/components/ui/FormField";
import { ErrorEnLinea } from "@/components/ui/InlineError";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";

export interface DatosNuevoAlimento {
  alimento: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

interface FormularioAlimentoProps {
  onGuardar: (datos: DatosNuevoAlimento) => Promise<void>;
  guardando?: boolean;
  /** Sin encabezado plegable: el formulario siempre se ve (p. ej. dentro de una hoja). */
  siempreAbierto?: boolean;
}

export function FormularioAlimento({
  onGuardar,
  guardando = false,
  siempreAbierto = false,
}: FormularioAlimentoProps) {
  const [expandido, setExpandido] = useState(false);
  const visible = siempreAbierto || expandido;
  const [nombre, setNombre] = useState("");
  const [calorias, setCalorias] = useState("");
  const [proteinas, setProteinas] = useState("");
  const [carbohidratos, setCarbohidratos] = useState("");
  const [grasas, setGrasas] = useState("");
  const [error, setError] = useState<string | null>(null);

  const limpiarError = () => setError(null);

  const handleGuardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError("Escribe el nombre del alimento.");
      return;
    }

    const calNum = parseFloat(calorias);
    if (isNaN(calNum) || calNum < 0) {
      setError("Ingresa las calorías del alimento (0 o más).");
      return;
    }

    setError(null);
    const protNum = parseFloat(proteinas) || 0;
    const carbNum = parseFloat(carbohidratos) || 0;
    const grasNum = parseFloat(grasas) || 0;

    try {
      await onGuardar({
        alimento: nombreLimpio,
        calorias: calNum,
        proteinas: Math.max(0, protNum),
        carbohidratos: Math.max(0, carbNum),
        grasas: Math.max(0, grasNum),
      });

      // Limpiar formulario y colapsar
      setNombre("");
      setCalorias("");
      setProteinas("");
      setCarbohidratos("");
      setGrasas("");
      setExpandido(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar el alimento.",
      );
    }
  };

  return (
    <View
      className={
        siempreAbierto
          ? "mb-2"
          : "mb-5 overflow-hidden rounded-3xl border border-border/50 bg-background shadow-sm"
      }
    >
      {/* Botón de expansión / Encabezado */}
      {siempreAbierto ? null : (
        <TouchableOpacity
          onPress={() => setExpandido((prev) => !prev)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Registrar alimento manualmente"
          accessibilityState={{ expanded: expandido }}
          className="min-h-11 flex-row items-center justify-between p-4"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
              <Ionicons name="add" size={20} color={palette.primary} />
            </View>
            <Text className="text-base font-bold text-foreground">
              Registrar alimento
            </Text>
          </View>

          <Ionicons
            name={expandido ? "chevron-up" : "chevron-down"}
            size={20}
            color={palette.foreground}
          />
        </TouchableOpacity>
      )}

      {/* Contenido expandible del formulario */}
      {visible ? (
        <View
          className={siempreAbierto ? "" : "border-t border-border/30 p-4 pt-3"}
        >
          <View className="mb-3.5">
            <CampoFormulario
              mayusculas
              etiqueta="Nombre del alimento"
              value={nombre}
              onChangeText={(t) => {
                setNombre(t);
                limpiarError();
              }}
              placeholder="Ej. Pechuga de pollo, Manzana..."
            />
          </View>

          <View className="mb-3.5 flex-row gap-3">
            <View className="flex-1">
              <CampoFormulario
                mayusculas
                etiqueta="Calorías (kcal)"
                value={calorias}
                onChangeText={(t) => {
                  setCalorias(t);
                  limpiarError();
                }}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <CampoFormulario
                mayusculas
                etiqueta="Proteínas (g)"
                value={proteinas}
                onChangeText={(t) => {
                  setProteinas(t);
                  limpiarError();
                }}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <CampoFormulario
                mayusculas
                etiqueta="Carbohidratos (g)"
                value={carbohidratos}
                onChangeText={(t) => {
                  setCarbohidratos(t);
                  limpiarError();
                }}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <CampoFormulario
                mayusculas
                etiqueta="Grasas (g)"
                value={grasas}
                onChangeText={(t) => {
                  setGrasas(t);
                  limpiarError();
                }}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <ErrorEnLinea mensaje={error} />

          {/* Botón de acción */}
          <TouchableOpacity
            onPress={handleGuardar}
            disabled={guardando}
            accessibilityState={{ disabled: guardando }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Agregar alimento"
            className="h-12 items-center justify-center rounded-2xl bg-primary"
          >
            {guardando ? (
              <IndicadorCarga decorativo color={palette.background} />
            ) : (
              <Text className="text-base font-bold text-background">
                Agregar alimento
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
