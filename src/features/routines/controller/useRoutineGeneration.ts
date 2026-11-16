import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ParametrosGeneracion,
  Rutina,
} from "@/features/routines/model/entities/Routine";
import { AuthController } from "@/features/auth/controller/AuthController";
import { RutinasController } from "@/features/routines/controller/RoutinesController";
import type { Usuario } from "@/features/profile";
import type { EjercicioWger } from "@/features/exercises";
import type { ConId } from "@/core/types";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/features/profile/controller/onboarding.store";
import { sustituirEjercicio } from "@/features/routines/model/rules/routineEditor";
import { toast } from "@/core/errors/toast";

type Fase = "cargando" | "confirmacion" | "generando" | "preview" | "error";

export function useGeneracionRutina(
  inicial: ParametrosGeneracion | null,
  onSalir: () => void,
) {
  const uid = useAuthStore((s) => s.user?.uid);
  const limpiarDestino = useOnboardingStore((s) => s.limpiarDestinoPendiente);
  const [fase, setFase] = useState<Fase>("cargando");
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [activa, setActiva] = useState<ConId<Rutina> | null>(null);
  const [parametros, setParametros] = useState(inicial);
  const [borrador, setBorrador] = useState<Rutina | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [intento, setIntento] = useState(0);
  const solicitud = useRef<AbortController | null>(null);
  const bloqueo = useRef(false);
  const guardadaId = useRef<string | null>(null);
  const montado = useRef(true);
  const parametrosIniciales = useRef(inicial);

  useEffect(() => {
    montado.current = true;
    limpiarDestino();
    return () => {
      montado.current = false;
      solicitud.current?.abort();
    };
  }, [limpiarDestino]);

  useEffect(() => {
    if (!uid) return;
    let datosPerfil: Usuario | null | undefined;
    let rutinas: ConId<Rutina>[] | undefined;
    let iniciado = false;
    const actualizar = () => {
      if (datosPerfil === undefined || !rutinas) return;
      setPerfil(datosPerfil);
      setActiva(
        rutinas.find((r) => r.id === datosPerfil?.rutinaActivaId) ?? null,
      );
      if (!iniciado) {
        iniciado = true;
        setError(null);
        setFase(parametrosIniciales.current ? "generando" : "confirmacion");
      }
    };
    const fallar = () => {
      setError("No se pudieron cargar tus datos. Reintenta para continuar.");
      setFase("error");
    };
    const unsubPerfil = AuthController.observarPerfil(
      uid,
      (p) => {
        datosPerfil = p;
        actualizar();
      },
      fallar,
    );
    const unsubRutinas = RutinasController.observar(
      uid,
      (r) => {
        rutinas = r;
        actualizar();
      },
      fallar,
    );
    return () => {
      unsubPerfil();
      unsubRutinas();
    };
  }, [uid, intento]);

  useEffect(() => {
    if (fase !== "generando" || !parametros || !uid) return;
    const controller = new AbortController();
    solicitud.current = controller;
    RutinasController.generarVistaPrevia(
      uid,
      parametros.objetivo,
      parametros.nivel,
      controller.signal,
    )
      .then((rutina) => {
        if (controller.signal.aborted) return;
        setBorrador(rutina);
        setFase("preview");
      })
      .catch((causa) => {
        if (controller.signal.aborted) return;
        setError(
          causa instanceof Error
            ? causa.message
            : "No se pudo generar la rutina.",
        );
        setFase("error");
      });
    return () => controller.abort();
  }, [fase, parametros, uid]);

  const salir = useCallback(() => {
    if (bloqueo.current) return;
    solicitud.current?.abort();
    onSalir();
  }, [onSalir]);

  const confirmar = (p: ParametrosGeneracion) => {
    setParametros(p);
    setError(null);
    setFase("generando");
  };

  const guardar = async (activar: boolean) => {
    if (!uid || !borrador || bloqueo.current) return;
    bloqueo.current = true;
    setGuardando(true);
    setError(null);
    try {
      // Si guardar funciona y activar falla, el reintento reutiliza el documento.
      const id =
        guardadaId.current ??
        (await RutinasController.guardarVistaPrevia(uid, borrador));
      guardadaId.current = id;
      if (montado.current) setGuardada(true);
      if (activar) {
        const anterior = await RutinasController.activarConAnterior(uid, id);
        toast.exito(
          anterior
            ? `Nueva rutina activada. «${anterior.nombre}» está en tus rutinas anteriores.`
            : "Nueva rutina activada.",
          {
            duracionMs: 6000,
            accion: {
              etiqueta: "DESHACER",
              ejecutar: async () => {
                if (useAuthStore.getState().user?.uid !== uid)
                  throw new Error(
                    "Inicia sesión con la misma cuenta para deshacer.",
                  );
                await RutinasController.deshacerActivacion(
                  uid,
                  id,
                  anterior?.id ?? null,
                );
                toast.exito(
                  anterior
                    ? `«${anterior.nombre}» vuelve a ser tu rutina activa.`
                    : "Activación deshecha. La nueva rutina sigue en tus rutinas anteriores.",
                );
              },
            },
          },
        );
      } else {
        toast.exito(
          "Rutina guardada en tus rutinas anteriores. Tu rutina activa no cambió.",
        );
      }
      bloqueo.current = false;
      if (montado.current) onSalir();
    } catch (causa) {
      if (montado.current) {
        const mensaje =
          causa instanceof Error
            ? causa.message
            : "No se pudo guardar. Tu borrador sigue disponible.";
        setError(
          guardadaId.current
            ? `${mensaje} La rutina ya está en tus rutinas anteriores. Puedes reintentar activarla.`
            : mensaje,
        );
      }
    } finally {
      bloqueo.current = false;
      if (montado.current) setGuardando(false);
    }
  };

  const reemplazar = (
    dia: number,
    indice: number,
    ejercicio: EjercicioWger,
  ) => {
    if (!borrador || bloqueo.current || guardadaId.current) return false;
    try {
      setBorrador(sustituirEjercicio(borrador, dia, indice, ejercicio));
      setError(null);
      return true;
    } catch (causa) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudo cambiar el ejercicio.",
      );
      return false;
    }
  };

  const reintentar = () => {
    setError(null);
    if (parametros) setFase("generando");
    else {
      setFase("cargando");
      setIntento((i) => i + 1);
    }
  };

  return {
    fase,
    perfil,
    activa,
    parametros,
    borrador,
    error,
    guardando,
    puedeEditar: !guardada && !guardando,
    salir,
    confirmar,
    guardar,
    reemplazar,
    reintentar,
  };
}
