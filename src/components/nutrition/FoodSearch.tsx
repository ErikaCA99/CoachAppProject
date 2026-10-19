import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { palette } from "@/constants/palette";
import { calcularPorcion } from "@/controllers/NutritionController";
import { useBuscarAlimentos } from "@/hooks/useFoodSearch";
import type { AlimentoUSDA } from "@/models/entities/USDAFood";
import { capitalizar } from "@/utils/foodTranslator";

interface BuscadorAlimentosProps {
  onAgregar: (
    alimento: AlimentoUSDA,
    gramos: number,
    nombre: string,
  ) => Promise<void>;
  guardando?: boolean;
}

const PORCIONES_RAPIDAS = [50, 100, 150, 200] as const;

export function BuscadorAlimentos({
  onAgregar,
  guardando = false,
}: BuscadorAlimentosProps) {
  const [texto, setTexto] = useState("");
  const [seleccionado, setSeleccionado] = useState<AlimentoUSDA | null>(null);
  const [nombre, setNombre] = useState("");
  const [gramos, setGramos] = useState("100");

  const { resultados, cargando, error, esValida } = useBuscarAlimentos(texto);

  const gramosNum = parseFloat(gramos.replace(",", "."));
  const porcion =
    seleccionado && gramosNum > 0
      ? calcularPorcion(seleccionado, gramosNum)
      : null;

  const seleccionar = (alimento: AlimentoUSDA) => {
    Keyboard.dismiss();
    setSeleccionado(alimento);
    setNombre(alimento.descripcionEs || capitalizar(texto));
    setGramos("100");
  };

  const limpiar = () => {
    setTexto("");
    setSeleccionado(null);
    setNombre("");
    setGramos("100");
  };

  const handleAgregar = async () => {
    if (!seleccionado) return;
    if (!(gramosNum > 0)) {
      Alert.alert("Cantidad inválida", "Ingresa los gramos consumidos.");
      return;
    }
    try {
      await onAgregar(seleccionado, gramosNum, nombre);
      limpiar();
    } catch (e) {
      Alert.alert(
        "Error al agregar",
        e instanceof Error ? e.message : "No se pudo registrar el alimento.",
      );
    }
  };

  return (
    <View className="mb-5 rounded-3xl border border-border/50 bg-white p-4 shadow-sm">
      {/* Encabezado */}
      <View className="mb-3 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="search" size={17} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            Buscar alimento
          </Text>
          <Text className="text-xs text-text-muted">
            Datos: USDA FoodData Central · valores por 100 g
          </Text>
        </View>
      </View>

      {/* Campo de búsqueda */}
      <View className="h-11 flex-row items-center rounded-xl border border-border/60 bg-slate-50/50 px-3">
        <Ionicons name="search-outline" size={16} color={palette.textMuted} />
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setSeleccionado(null);
          }}
          placeholder="Ej. arroz cocido, pechuga de pollo, plátano"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          returnKeyType="search"
          className="ml-2 flex-1 text-sm text-foreground"
          accessibilityLabel="Buscar alimento"
        />
        {texto.length > 0 ? (
          <TouchableOpacity
            onPress={limpiar}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Detalle del alimento seleccionado */}
      {seleccionado ? (
        <View className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
          <Text className="text-xs text-text-muted" numberOfLines={2}>
            {seleccionado.descripcionEs || seleccionado.descripcion}
          </Text>

          <Text className="mb-1 mt-3 text-xs font-bold tracking-wider text-text-muted">
            NOMBRE EN TU REGISTRO
          </Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder={seleccionado.descripcionEs || seleccionado.descripcion}
            placeholderTextColor="#9ca3af"
            className="h-10 rounded-xl border border-border/60 bg-white px-3 text-sm text-foreground"
          />

          <Text className="mb-1 mt-3 text-xs font-bold tracking-wider text-text-muted">
            CANTIDAD (G)
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={gramos}
              onChangeText={setGramos}
              keyboardType="numeric"
              className="h-10 w-20 rounded-xl border border-border/60 bg-white text-center text-sm font-semibold text-foreground"
              accessibilityLabel="Gramos consumidos"
            />
            {PORCIONES_RAPIDAS.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGramos(String(g))}
                activeOpacity={0.7}
                className={`rounded-full px-3 py-1.5 ${
                  gramosNum === g ? "bg-primary" : "bg-white"
                } border border-border/60`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    gramosNum === g ? "text-background" : "text-foreground"
                  }`}
                >
                  {g} g
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Vista previa de la porción */}
          {porcion ? (
            <View className="mt-3 flex-row items-center justify-between rounded-xl bg-white p-3">
              <View>
                <Text className="text-2xl font-extrabold text-foreground">
                  {porcion.calorias}
                  <Text className="text-xs font-semibold text-text-muted">
                    {" "}
                    kcal
                  </Text>
                </Text>
                <Text className="mt-0.5 text-xs text-text-muted">
                  P: {porcion.proteinas}g · C: {porcion.carbohidratos}g · G:{" "}
                  {porcion.grasas}g
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-3 flex-row gap-2.5">
            <TouchableOpacity
              onPress={() => setSeleccionado(null)}
              activeOpacity={0.7}
              className="h-11 flex-1 items-center justify-center rounded-2xl border border-border/60 bg-white"
            >
              <Text className="text-sm font-semibold text-text-secondary">
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAgregar}
              disabled={guardando || !porcion}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Agregar alimento al registro de hoy"
              className={`h-11 flex-[2] items-center justify-center rounded-2xl ${
                porcion ? "bg-primary" : "bg-primary/40"
              }`}
            >
              {guardando ? (
                <ActivityIndicator color={palette.background} />
              ) : (
                <Text className="text-sm font-bold text-background">
                  Agregar al día
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : esValida ? (
        /* Resultados de la API */
        <View className="mt-3">
          {cargando ? (
            <View className="flex-row items-center justify-center gap-2 py-4">
              <ActivityIndicator size="small" color={palette.primary} />
              <Text className="text-xs text-text-muted">Buscando…</Text>
            </View>
          ) : error ? (
            <View className="flex-row items-center gap-2 rounded-xl bg-accent/10 p-3">
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={palette.error}
              />
              <Text className="flex-1 text-xs text-error">{error}</Text>
            </View>
          ) : resultados.length === 0 ? (
            <Text className="py-3 text-center text-xs text-text-muted">
              Sin resultados para “{texto.trim()}”. Prueba con otro nombre o
              regístralo manualmente abajo.
            </Text>
          ) : (
            <View className="gap-2">
              {resultados.map((alimento) => (
                <TouchableOpacity
                  key={alimento.fdcId}
                  onPress={() => seleccionar(alimento)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${alimento.descripcionEs || alimento.descripcion}, ${alimento.caloriasPor100g} calorías por 100 gramos`}
                  className="flex-row items-center justify-between rounded-xl border border-border/40 bg-white p-3"
                >
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-sm font-semibold text-foreground"
                      numberOfLines={2}
                    >
                      {alimento.descripcionEs || alimento.descripcion}
                    </Text>
                    <Text className="mt-0.5 text-xs text-text-muted">
                      P: {alimento.proteinasPor100g}g · C:{" "}
                      {alimento.carbohidratosPor100g}g · G:{" "}
                      {alimento.grasasPor100g}g
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-primary">
                      {alimento.caloriasPor100g}
                    </Text>
                    <Text className="text-xs text-text-muted">kcal/100g</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
