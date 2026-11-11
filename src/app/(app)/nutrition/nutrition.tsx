import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { HojaAnadirAlimento } from "@/components/nutrition/AddFoodSheet";
import { CalculadoraIMCCard } from "@/components/nutrition/BMICalculatorCard";
import { CaloriasGauge } from "@/components/nutrition/CaloriesGauge";
import { type DatosNuevoAlimento } from "@/components/nutrition/FoodForm";
import { ListaAlimentosHoy } from "@/components/nutrition/TodayFoodList";
import { TablaReferenciaIMC } from "@/components/nutrition/BMIReferenceTable";
import { IndicadorCarga } from "@/components/ui/LoadingIndicator";
import { AppHeader } from "@/components/ui/AppHeader";
import { ErrorCarga } from "@/components/ui/LoadError";
import { BotonPrimario } from "@/components/ui/PrimaryButton";
import { PantallaBase } from "@/components/ui/ScreenBase";
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
import { useErrorDeCarga } from "@/hooks/useLoadError";
import type { AlimentoUSDA } from "@/models/entities/USDAFood";
import type { RegistroNutricional } from "@/models/entities/NutritionRecord";
import type { Usuario } from "@/models/entities/User";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/utils/toast";

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
  const [hojaAbierta, setHojaAbierta] = useState(false);

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

  // Ingesta rápida mediante chips (la hoja muestra el error si lanza)
  const handleAgregarRapido = async (item: AlimentoRapido) => {
    if (!user) return;
    setGuardandoAlimento(true);
    try {
      await NutritionController.registrarIngesta(user.uid, {
        alimento: item.nombre,
        calorias: item.calorias,
        proteinas: item.proteinas,
        carbohidratos: item.carbohidratos,
        grasas: item.grasas,
      });
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
      toast.exito("Alimento añadido");
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
      toast.exito("Alimento añadido");
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
      toast.error(
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
    <PantallaBase
      encabezado={
        <AppHeader
          title="Nutrición"
          subtitle={fechaFormateada}
          onProfilePress={() => router.push("/(app)/profile")}
        />
      }
      pie={
        /* Acción principal siempre a la vista en el Diario */
        vista === "diario" && !error && !cargando ? (
          <View className="border-t border-primary-light/60 bg-background px-5 pb-3 pt-3">
            <BotonPrimario
              titulo="Añadir alimento"
              onPress={() => setHojaAbierta(true)}
            />
          </View>
        ) : null
      }
    >
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
          <IndicadorCarga size="large" color={palette.primary} />
        </View>
      ) : vista === "diario" ? (
        <View>
          {/* Tarjeta de balance calórico y macronutrientes */}
          <CaloriasGauge
            resumen={resumenDiario}
            origenMeta={resultadoMetas}
            onCompletarPerfil={() => router.push("/(app)/profile")}
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

      <HojaAnadirAlimento
        visible={hojaAbierta}
        onCerrar={() => setHojaAbierta(false)}
        guardando={guardandoAlimento}
        onAgregarDesdeAPI={handleAgregarDesdeAPI}
        onAgregarRapido={handleAgregarRapido}
        onGuardarManual={handleGuardarFormulario}
      />
    </PantallaBase>
  );
}
