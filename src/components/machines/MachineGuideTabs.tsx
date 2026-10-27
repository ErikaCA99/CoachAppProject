import { useState } from "react";
import { View } from "react-native";

import { TarjetaPosesEjercicio } from "@/components/machines/ExercisePoseCard";
import { DemostracionesLocales } from "@/components/machines/LocalDemonstrations";
import { ClavesSeguridad } from "@/components/machines/SafetyKeys";
import { ListaPuntos } from "@/components/machines/SheetSection";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Typography";
import { palette } from "@/constants/palette";
import { MaquinasController } from "@/controllers/MachinesController";
import type { EjercicioGif, Maquina } from "@/models/entities/Machine";

type VistaGuia = "uso" | "errores" | "prevencion";

interface GuiaMaquinaTabsProps {
  maquina: Maquina;
  onAbrirEjercicio: (ejercicio: EjercicioGif) => void;
}

function SinDatos({ texto }: { texto: string }) {
  return <Text className="text-sm leading-6 text-text-secondary">{texto}</Text>;
}

/**
 * Contenido principal de la ficha de una máquina en tres vistas (Uso,
 * Errores, Prevención): solo se muestra una a la vez, así la ficha deja de
 * ser una columna larga de tarjetas.
 */
export function GuiaMaquinaTabs({
  maquina,
  onAbrirEjercicio,
}: GuiaMaquinaTabsProps) {
  const [vista, setVista] = useState<VistaGuia>("uso");

  return (
    <View>
      <SegmentedControl
        options={[
          { value: "uso", label: "Uso" },
          { value: "errores", label: "Errores" },
          { value: "prevencion", label: "Prevención" },
        ]}
        value={vista}
        onChange={setVista}
      />

      <View className="mt-4">
        {vista === "uso" && (
          <View>
            <DemostracionesLocales key={maquina.id} maquinaId={maquina.id} />
            {maquina.ejerciciosGif.length > 0 && (
              <View className="mb-2">
                <Text className="mb-1 text-base font-bold text-foreground">
                  Ejercicios que puedes hacer
                </Text>
                <Text className="mb-3 text-sm text-text-secondary">
                  Mira cómo se ve el inicio y el final del movimiento.
                </Text>
                {maquina.ejerciciosGif.map((e) => (
                  <TarjetaPosesEjercicio
                    key={e.workoutxId}
                    ejercicio={e}
                    poses={MaquinasController.posesDeEjercicio(maquina, e)}
                    onPress={() => onAbrirEjercicio(e)}
                  />
                ))}
              </View>
            )}

            <View className="mb-5">
              <ClavesSeguridad puntos={maquina.prevencionLesiones} />
            </View>

            <Text className="mb-3 text-base font-bold text-foreground">
              Cómo usarla
            </Text>
            {maquina.instrucciones.length === 0 ? (
              <SinDatos texto="Aún no hay pasos para esta máquina." />
            ) : (
              maquina.instrucciones.map((paso, i) => (
                <View key={i} className="mb-3 flex-row items-start">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Text className="text-sm font-bold text-background">
                      {i + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 pt-1 text-sm leading-6 text-foreground">
                    {paso}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {vista === "errores" &&
          (maquina.erroresComunes.length === 0 ? (
            <SinDatos texto="Aún no hay errores comunes registrados." />
          ) : (
            <ListaPuntos
              puntos={maquina.erroresComunes}
              icono="close"
              colorIcono={palette.accentStrong}
            />
          ))}

        {vista === "prevencion" &&
          (maquina.prevencionLesiones.length === 0 ? (
            <SinDatos texto="Aún no hay consejos de prevención registrados." />
          ) : (
            <ListaPuntos
              puntos={maquina.prevencionLesiones}
              icono="warning-outline"
              colorIcono={palette.accentStrong}
            />
          ))}
      </View>
    </View>
  );
}
