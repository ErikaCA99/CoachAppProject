import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vibration } from "react-native";

import { AuthController } from "@/controllers/AuthController";
import { RutinasController } from "@/controllers/RoutinesController";
import { EntrenamientosController } from "@/controllers/WorkoutsController";
import { useErrorDeCarga } from "@/hooks/useLoadError";
import type { Rutina } from "@/models/entities/Routine";
import type { ConId } from "@/models/types";
import { useAuthStore } from "@/store/auth.store";
import type { ResultadoAccion } from "@/types/actionResult";
import {
  completarSerie,
  crearSesion,
  segundosDescanso,
  saltarEjercicio,
  terminarDescanso,
  type SesionEntrenamiento,
} from "@/utils/workoutSession";

const OK: ResultadoAccion = { ok: true };
const INTERVALO_TEMPORIZADOR_MS = 250;
const VIBRACION_FIN_DESCANSO_MS = 400;

/**
 * Controlador de la pantalla "Entrenar hoy" (capa de orquestación): carga el
 * día de la rutina activa, mantiene la sesión guiada (serie actual, descanso)
 * y registra el día como completado al terminar. La Vista solo pinta.
 */
export function useEntrenamientoGuiado(numeroDia: number | null) {
  const uid = useAuthStore((s) => s.user?.uid);
  const { error, intento, reportar, reintentar } = useErrorDeCarga();

  // `undefined` = el perfil aún no respondió (distinto de "sin rutina activa").
  const [rutinaActivaId, setRutinaActivaId] = useState<
    string | null | undefined
  >(undefined);
  const [rutinas, setRutinas] = useState<ConId<Rutina>[] | null>(null);

  const [sesion, setSesion] = useState<SesionEntrenamiento | null>(null);
  const [diaInicializado, setDiaInicializado] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [duracionSegundos, setDuracionSegundos] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const inicioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    let activo = true;
    const alFallar = (origen: string) => (causa: Error) => {
      if (activo) reportar(origen, causa);
    };

    const unsubPerfil = AuthController.observarPerfil(
      uid,
      (perfil) => setRutinaActivaId(perfil?.rutinaActivaId ?? null),
      alFallar("perfil"),
    );
    const unsubRutinas = RutinasController.observar(
      uid,
      setRutinas,
      alFallar("rutinas"),
    );

    return () => {
      activo = false;
      unsubPerfil();
      unsubRutinas();
    };
  }, [uid, intento, reportar]);

  const cargando = rutinaActivaId === undefined || rutinas === null;
  const rutina = rutinas?.find((r) => r.id === rutinaActivaId) ?? null;
  const dia = rutina?.planSemanal.find((d) => d.dia === numeroDia) ?? null;

  // La sesión se crea una sola vez por pantalla: si la rutina se edita
  // mientras entrena, no se reinicia el avance.
  if (dia && !diaInicializado) {
    setDiaInicializado(true);
    if (!sesion) {
      setSesion(crearSesion(dia.ejercicios));
    }
  }

  useEffect(() => {
    if (dia && inicioRef.current === null) {
      inicioRef.current = Date.now();
    }
  }, [dia]);

  // ── Temporizador de descanso ─────────────────────────────────────────
  const terminaEn = sesion?.descansoTerminaEn ?? null;
  useEffect(() => {
    if (terminaEn === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= terminaEn) clearInterval(id);
    }, INTERVALO_TEMPORIZADOR_MS);
    return () => clearInterval(id);
  }, [terminaEn]);

  const segundosRestantes = sesion ? segundosDescanso(sesion, ahora) : 0;
  const enDescanso = segundosRestantes > 0;

  // Avisa con una vibración corta cuando el descanso termina solo (no si lo
  // saltó el usuario: ahí `descansoTerminaEn` pasa a `null`).
  const estabaEnDescanso = useRef(false);
  useEffect(() => {
    if (estabaEnDescanso.current && !enDescanso && terminaEn !== null) {
      Vibration.vibrate(VIBRACION_FIN_DESCANSO_MS);
    }
    estabaEnDescanso.current = enDescanso;
  }, [enDescanso, terminaEn]);

  const terminado = sesion?.terminado ?? false;
  useEffect(() => {
    if (terminado && inicioRef.current !== null) {
      setDuracionSegundos(Math.round((Date.now() - inicioRef.current) / 1000));
    }
  }, [terminado]);

  // ── Datos derivados ──────────────────────────────────────────────────
  const ejercicioActual =
    sesion && !terminado ? dia?.ejercicios[sesion.indice] : null;

  /** Duración total del descanso en curso (el del ejercicio recién trabajado). */
  const descansoTotal = useMemo(() => {
    if (!sesion || !dia) return 0;
    const previo = sesion.serie > 1 ? sesion.indice : sesion.indice - 1;
    return dia.ejercicios[previo]?.descansoSegundos ?? 0;
  }, [sesion, dia]);

  /** Hay avance que se perdería si el usuario sale ahora. */
  const hayAvance = !!sesion && (sesion.indice > 0 || sesion.serie > 1);

  // ── Acciones ─────────────────────────────────────────────────────────
  const completarSerieActual = useCallback(() => {
    if (enDescanso) return;
    const t = Date.now();
    setAhora(t);
    setSesion((s) => (s ? completarSerie(s, t) : s));
  }, [enDescanso]);

  const saltarDescanso = useCallback(() => {
    setSesion((s) => (s ? terminarDescanso(s) : s));
  }, []);

  const saltarEjercicioActual = useCallback(() => {
    setSesion((s) => (s ? saltarEjercicio(s) : s));
  }, []);

  /** Registra el día como completado hoy. */
  const finalizar = useCallback(async (): Promise<ResultadoAccion> => {
    if (!uid || !rutina || numeroDia === null) return OK;
    setGuardando(true);
    try {
      await EntrenamientosController.marcarCompletadoHoy(
        uid,
        rutina.id,
        numeroDia,
      );
      return OK;
    } catch (causa) {
      console.error("Error al guardar el entrenamiento:", causa);
      return {
        ok: false,
        titulo: "No se pudo guardar",
        mensaje: "Revisa tu conexión e inténtalo de nuevo.",
      };
    } finally {
      setGuardando(false);
    }
  }, [uid, rutina, numeroDia]);

  return {
    // estado de carga
    cargando,
    error,
    reintentar,
    // datos
    rutina,
    dia,
    sesion,
    ejercicioActual,
    terminado,
    hayAvance,
    // descanso
    enDescanso,
    segundosRestantes,
    descansoTotal,
    // resumen
    duracionSegundos,
    guardando,
    // acciones
    completarSerieActual,
    saltarDescanso,
    saltarEjercicioActual,
    finalizar,
  };
}
