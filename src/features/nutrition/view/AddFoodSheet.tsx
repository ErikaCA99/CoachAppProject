import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { View } from "react-native";

import { BuscadorAlimentos } from "@/features/nutrition/view/FoodSearch";
import {
  FormularioAlimento,
  type DatosNuevoAlimento,
} from "@/features/nutrition/view/FoodForm";
import { AgregarRapido } from "@/features/nutrition/view/QuickAdd";
import { HojaInferior } from "@/shared/ui/BottomSheet";
import { ErrorEnLinea } from "@/shared/ui/InlineError";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { Text } from "@/shared/ui/Typography";
import { palette } from "@/shared/theme/palette";
import type { AlimentoRapido } from "@/features/nutrition/controller/NutritionController";
import type { AlimentoUSDA } from "@/features/nutrition/model/entities/USDAFood";

type ModoAnadir = "buscar" | "rapido" | "manual";

interface HojaAnadirAlimentoProps {
  visible: boolean;
  onCerrar: () => void;
  guardando: boolean;
  /** Búsqueda USDA: lanza si falla (el buscador muestra el error en la hoja). */
  onAgregarDesdeAPI: (
    alimento: AlimentoUSDA,
    gramos: number,
    nombre: string,
  ) => Promise<void>;
  /** Adición rápida: lanza si falla (el error se muestra en la hoja). */
  onAgregarRapido: (alimento: AlimentoRapido) => Promise<void>;
  /** Formulario manual: lanza si falla (el formulario muestra el error). */
  onGuardarManual: (datos: DatosNuevoAlimento) => Promise<void>;
}

/**
 * Hoja «Añadir alimento»: reúne los tres modos de registrar una comida
 * (Buscar, Rápido, Manual) sin ocupar espacio en la pantalla de Nutrición.
 * Un `Modal` tapa los avisos flotantes, así que los errores y la
 * confirmación de la adición rápida se muestran dentro de la hoja.
 */
export function HojaAnadirAlimento({
  visible,
  onCerrar,
  guardando,
  onAgregarDesdeAPI,
  onAgregarRapido,
  onGuardarManual,
}: HojaAnadirAlimentoProps) {
  const [modo, setModo] = useState<ModoAnadir>("buscar");
  const [errorRapido, setErrorRapido] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);

  const cerrar = () => {
    setErrorRapido(null);
    setConfirmacion(null);
    onCerrar();
  };

  /** Buscar y Manual terminan con el alimento ya registrado: se cierra la hoja. */
  const conCierre =
    <A extends unknown[]>(accion: (...args: A) => Promise<void>) =>
    async (...args: A) => {
      await accion(...args);
      cerrar();
    };

  const agregarRapido = async (alimento: AlimentoRapido) => {
    setErrorRapido(null);
    setConfirmacion(null);
    try {
      await onAgregarRapido(alimento);
      setConfirmacion(
        `Añadido: ${alimento.nombre} · +${alimento.calorias} kcal`,
      );
    } catch (e) {
      setErrorRapido(
        e instanceof Error ? e.message : "No se pudo registrar el alimento.",
      );
    }
  };

  return (
    <HojaInferior
      visible={visible}
      onCerrar={cerrar}
      titulo="Añadir alimento"
      alturaMaxima="90%"
    >
      <View className="mb-4">
        <SegmentedControl
          options={[
            { value: "buscar", label: "Buscar" },
            { value: "rapido", label: "Rápido" },
            { value: "manual", label: "Manual" },
          ]}
          value={modo}
          onChange={(nuevo) => {
            setModo(nuevo);
            setErrorRapido(null);
            setConfirmacion(null);
          }}
        />
      </View>

      {modo === "buscar" ? (
        <BuscadorAlimentos
          onAgregar={conCierre(onAgregarDesdeAPI)}
          guardando={guardando}
        />
      ) : null}

      {modo === "rapido" ? (
        <View>
          <AgregarRapido onAgregar={agregarRapido} deshabilitado={guardando} />
          <ErrorEnLinea mensaje={errorRapido} />
          {confirmacion ? (
            <View
              className="flex-row items-center rounded-xl bg-primary/10 p-3"
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={palette.primary}
                accessible={false}
              />
              <Text className="ml-2 flex-1 text-sm font-semibold text-foreground">
                {confirmacion}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {modo === "manual" ? (
        <FormularioAlimento
          siempreAbierto
          onGuardar={conCierre(onGuardarManual)}
          guardando={guardando}
        />
      ) : null}
    </HojaInferior>
  );
}
