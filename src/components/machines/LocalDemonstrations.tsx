import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState, Pressable, View } from "react-native";

import { Text } from "@/components/ui/Typography";
import { MaquinasController } from "@/controllers/MachinesController";
import { useReducirMovimiento } from "@/hooks/useReducedMotion";
import type { DemostracionLocal } from "@/models/entities/LocalDemonstration";

function VisorDemostracion({
  demostracion,
}: {
  demostracion: DemostracionLocal;
}) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const [fallo, setFallo] = useState(false);
  const reducir = useReducirMovimiento();
  const animar = reproduciendo && !reducir && !fallo;

  useFocusEffect(useCallback(() => () => setReproduciendo(false), []));

  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") setReproduciendo(false);
    });
    return () => suscripcion.remove();
  }, []);

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-background">
      <View className="bg-white">
        <Image
          key={animar ? "animacion" : "estatica"}
          source={animar ? demostracion.recurso : demostracion.vistaEstatica}
          style={{ width: "100%", aspectRatio: 1.2 }}
          contentFit="contain"
          autoplay={animar}
          accessibilityLabel={`Demostración de ${demostracion.nombre}`}
          onError={() => setFallo(true)}
        />
      </View>
      <View className="p-4">
        <Text className="text-base font-bold text-foreground">
          {demostracion.nombre}
        </Text>
        <Text className="mt-2 text-sm leading-6 text-text-secondary">
          {demostracion.indicacion}
        </Text>
        {fallo ? (
          <Text accessibilityRole="alert" className="mt-3 text-sm text-error">
            No se pudo mostrar esta demostración.
          </Text>
        ) : reducir ? (
          <Text className="mt-3 text-sm text-text-secondary">
            Vista estática porque está activada la opción de reducir movimiento.
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${animar ? "Detener" : "Reproducir"} demostración de ${demostracion.nombre}`}
            onPress={() => setReproduciendo((valor) => !valor)}
            className="mt-3 min-h-12 items-center justify-center rounded-xl bg-primary px-4 active:opacity-80"
          >
            <Text className="text-sm font-bold text-background">
              {animar ? "Detener animación" : "Reproducir animación"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Una sola imagen montada: las variantes se eligen sin reproducir varios GIFs a la vez. */
export function DemostracionesLocales({ maquinaId }: { maquinaId: string }) {
  const demostraciones = MaquinasController.demostracionesLocales(maquinaId);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const seleccion =
    demostraciones.find((item) => item.id === seleccionId) ?? demostraciones[0];
  if (!seleccion) return null;

  return (
    <View className="mb-5">
      <Text
        accessibilityRole="header"
        className="mb-1 text-base font-bold text-foreground"
      >
        Demostraciones del movimiento
      </Text>
      <Text className="mb-3 text-sm leading-6 text-text-secondary">
        Observa el ejercicio y comprueba que tu equipo tenga los mismos apoyos y
        accesorios.
      </Text>
      {demostraciones.length > 1 && (
        <View className="mb-3 gap-2">
          {demostraciones.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === seleccion.id }}
              onPress={() => setSeleccionId(item.id)}
              className={`min-h-12 justify-center rounded-xl px-4 py-3 active:opacity-80 ${item.id === seleccion.id ? "bg-primary" : "bg-primary-light/25"}`}
            >
              <Text
                className={`text-sm font-semibold ${item.id === seleccion.id ? "text-background" : "text-primary"}`}
              >
                {item.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <VisorDemostracion key={seleccion.id} demostracion={seleccion} />
    </View>
  );
}
