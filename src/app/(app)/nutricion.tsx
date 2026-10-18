import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";

import { AgregarRapido } from "@/components/nutricion/AgregarRapido";
import { BuscadorAlimentos } from "@/components/nutricion/BuscadorAlimentos";
import { CalculadoraIMCCard } from "@/components/nutricion/CalculadoraIMCCard";
import { CaloriasGauge } from "@/components/nutricion/CaloriasGauge";
import {
  FormularioAlimento,
  type DatosNuevoAlimento,
} from "@/components/nutricion/FormularioAlimento";
import { ListaAlimentosHoy } from "@/components/nutricion/ListaAlimentosHoy";
import { TablaReferenciaIMC } from "@/components/nutricion/TablaReferenciaIMC";
import { AppHeader } from "@/components/ui/AppHeader";
import { ErrorCarga } from "@/components/ui/ErrorCarga";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { palette } from "@/constants/palette";
import { AuthController } from "@/controllers/AuthController";
import {
  calcularMetasNutricionales,
  calcularResumenDiario,
  filtrarAlimentosDeHoy,
  NutritionController,
  type AlimentoRapido,
} from "@/controllers/NutritionController";
import { useErrorDeCarga } from "@/hooks/useErrorDeCarga";
import type { AlimentoUSDA } from "@/models/entities/AlimentoUSDA";
import type { RegistroNutricional } from "@/models/entities/RegistroNutricional";
import type { Usuario } from "@/models/entities/Usuario";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";

type VistaNutricion = "diario" | "imc";

function obtenerFechaHoyFormateada(): string {
  const hoy = new Date();
  const opciones: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  return hoy.toLocaleDateString("es-ES", opciones);
}

export default function NutricionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [vista, setVista] = useState<VistaNutricion>("diario");

  const [registros, setRegistros] = useState<ConId<RegistroNutricional>[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoAlimento, setGuardandoAlimento] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const { error, intento, reportar, reintentar } = useErrorDeCarga();

  const [perfil, setPerfil] = useState<Usuario | null>(null);

  const fechaFormateada = useMemo(() => obtenerFechaHoyFormateada(), []);

  // Perfil en tiempo real: si el usuario edita peso/edad/objetivo, la meta
  // del día se recalcula sola.
  useEffect(() => {
    if (!user) return;
    return AuthController.observarPerfil(user.uid, setPerfil);
  }, [user]);

  // Metas diarias personalizadas (Mifflin-St Jeor + actividad + objetivo)
  const resultadoMetas = useMemo(
    () => calcularMetasNutricionales(perfil),
    [perfil],
  );

  // Suscripción en tiempo real a los registros nutricionales del usuario
  useEffect(() => {
    if (!user) return;

    const unsubscribe = NutritionController.observar(
      user.uid,
      (datos) => {
        setRegistros(datos);
        setCargando(false);
      },
      (causa) => reportar("nutricion", causa),
    );

    return () => {
      unsubscribe();
    };
  }, [user, intento, reportar]);

  // Alimentos consumidos durante el día de hoy
  const alimentosHoy = useMemo(
    () => filtrarAlimentosDeHoy(registros),
    [registros],
  );

  // Resumen del balance calórico y macronutrientes del día
  const resumenDiario = useMemo(
    () => calcularResumenDiario(alimentosHoy, resultadoMetas.metas),
    [alimentosHoy, resultadoMetas],
  );

  // Ingesta rápida mediante chips
  const handleAgregarRapido = async (item: AlimentoRapido) => {
    if (!user) return;
    try {
      setGuardandoAlimento(true);
      await NutritionController.registrarIngesta(user.uid, {
        alimento: item.nombre,
        calorias: item.calorias,
        proteinas: item.proteinas,
        carbohidratos: item.carbohidratos,
        grasas: item.grasas,
      });
    } catch (error) {
      Alert.alert(
        "Error al agregar",
        error instanceof Error
          ? error.message
          : "No se pudo registrar el alimento.",
      );
    } finally {
      setGuardandoAlimento(false);
    }
  };

  // Ingesta personalizada mediante formulario
  const handleGuardarFormulario = async (datos: DatosNuevoAlimento) => {
    if (!user) return;
    setGuardandoAlimento(true);
    try {
      await NutritionController.registrarIngesta(user.uid, datos);
    } finally {
      setGuardandoAlimento(false);
    }
  };

  // Ingesta desde la API de USDA (el componente maneja la alerta de error)
  const handleAgregarDesdeAPI = async (
    alimento: AlimentoUSDA,
    gramos: number,
    nombre: string,
  ) => {
    if (!user) return;
    setGuardandoAlimento(true);
    try {
      await NutritionController.registrarAlimentoUSDA(
        user.uid,
        alimento,
        gramos,
        nombre,
      );
    } finally {
      setGuardandoAlimento(false);
    }
  };

  // Eliminación de un alimento registrado hoy
  const handleEliminarAlimento = async (id: string) => {
    if (!user) return;
    setEliminandoId(id);
    try {
      await NutritionController.eliminar(user.uid, id);
    } catch (error) {
      Alert.alert(
        "Error al eliminar",
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el alimento.",
      );
    } finally {
      setEliminandoId(null);
    }
  };

  // Cálculo de IMC para la pestaña "Calc. IMC"
  const handleCalcularIMC = async (pesoKg: number, alturaCm: number) => {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    return NutritionController.calcularYGuardarIMC(user.uid, pesoKg, alturaCm);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 20,
        paddingTop: 56,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Encabezado superior unificado */}
      <AppHeader
        title="Nutrición"
        subtitle={fechaFormateada}
        onProfilePress={() => router.push("/(app)/perfil")}
      />

      {/* Selector de pestañas: Diario vs Calc. IMC */}
      <View className="mb-5">
        <SegmentedControl
          options={[
            { value: "diario", label: "Diario" },
            { value: "imc", label: "Calc. IMC" },
          ]}
          value={vista}
          onChange={setVista}
        />
      </View>

      {error ? (
        <ErrorCarga mensaje={error} onReintentar={reintentar} />
      ) : cargando ? (
        <View className="items-center justify-center py-20">
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : vista === "diario" ? (
        <View>
          {/* Tarjeta de balance calórico y macronutrientes */}
          <CaloriasGauge
            resumen={resumenDiario}
            origenMeta={resultadoMetas}
            onCompletarPerfil={() => router.push("/(app)/perfil")}
          />

          {/* Búsqueda de alimentos en USDA FoodData Central */}
          <BuscadorAlimentos
            onAgregar={handleAgregarDesdeAPI}
            guardando={guardandoAlimento}
          />

          {/* Carrusel de adición rápida de alimentos */}
          <AgregarRapido
            onAgregar={handleAgregarRapido}
            deshabilitado={guardandoAlimento}
          />

          {/* Formulario colapsable para agregar alimento personalizado */}
          <FormularioAlimento
            onGuardar={handleGuardarFormulario}
            guardando={guardandoAlimento}
          />

          {/* Listado de alimentos registrados hoy o estado vacío */}
          <ListaAlimentosHoy
            alimentos={alimentosHoy}
            onEliminar={handleEliminarAlimento}
            eliminandoId={eliminandoId}
          />
        </View>
      ) : (
        <View>
          {/* Tarjeta interactiva de cálculo de IMC */}
          <CalculadoraIMCCard onCalcular={handleCalcularIMC} />

          {/* Tabla de referencia con rangos oficiales de IMC */}
          <TablaReferenciaIMC />
        </View>
      )}
    </ScrollView>
  );
}
