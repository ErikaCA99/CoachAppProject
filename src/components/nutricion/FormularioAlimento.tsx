import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
}

export function FormularioAlimento({
  onGuardar,
  guardando = false,
}: FormularioAlimentoProps) {
  const [expandido, setExpandido] = useState(false);
  const [nombre, setNombre] = useState("");
  const [calorias, setCalorias] = useState("");
  const [proteinas, setProteinas] = useState("");
  const [carbohidratos, setCarbohidratos] = useState("");
  const [grasas, setGrasas] = useState("");

  const handleGuardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      Alert.alert(
        "Nombre requerido",
        "Por favor escribe el nombre del alimento.",
      );
      return;
    }

    const calNum = parseFloat(calorias);
    if (isNaN(calNum) || calNum < 0) {
      Alert.alert(
        "Calorías inválidas",
        "Ingresa un valor válido de calorías (>= 0).",
      );
      return;
    }

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
    } catch (error) {
      Alert.alert(
        "Error al guardar",
        error instanceof Error
          ? error.message
          : "No se pudo registrar el alimento.",
      );
    }
  };

  return (
    <View className="mb-5 overflow-hidden rounded-3xl border border-border/50 bg-white shadow-sm">
      {/* Botón de expansión / Encabezado */}
      <TouchableOpacity
        onPress={() => setExpandido((prev) => !prev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Desplegar formulario para registrar alimento"
        className="flex-row items-center justify-between p-4"
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

      {/* Contenido expandible del formulario */}
      {expandido ? (
        <View className="border-t border-border/30 p-4 pt-3">
          {/* Nombre del alimento */}
          <View className="mb-3.5">
            <Text className="mb-1.5 text-[11px] font-bold tracking-wider text-text-muted">
              NOMBRE DEL ALIMENTO
            </Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Pechuga de pollo, Manzana..."
              placeholderTextColor="#9ca3af"
              className="h-11 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground"
            />
          </View>

          {/* Fila 1: Calorías y Proteínas */}
          <View className="mb-3.5 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-[11px] font-bold tracking-wider text-text-muted">
                CALORÍAS (KCAL)
              </Text>
              <TextInput
                value={calorias}
                onChangeText={setCalorias}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground"
              />
            </View>

            <View className="flex-1">
              <Text className="mb-1.5 text-[11px] font-bold tracking-wider text-text-muted">
                PROTEÍNAS (G)
              </Text>
              <TextInput
                value={proteinas}
                onChangeText={setProteinas}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground"
              />
            </View>
          </View>

          {/* Fila 2: Carbohidratos y Grasas */}
          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-[11px] font-bold tracking-wider text-text-muted">
                CARBOHIDRATOS (G)
              </Text>
              <TextInput
                value={carbohidratos}
                onChangeText={setCarbohidratos}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground"
              />
            </View>

            <View className="flex-1">
              <Text className="mb-1.5 text-[11px] font-bold tracking-wider text-text-muted">
                GRASAS (G)
              </Text>
              <TextInput
                value={grasas}
                onChangeText={setGrasas}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                className="h-11 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground"
              />
            </View>
          </View>

          {/* Botón de acción */}
          <TouchableOpacity
            onPress={handleGuardar}
            disabled={guardando}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Agregar alimento"
            className="h-12 items-center justify-center rounded-2xl bg-primary"
          >
            {guardando ? (
              <ActivityIndicator color={palette.background} />
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
