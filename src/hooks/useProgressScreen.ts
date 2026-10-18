import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthController } from "@/controllers/AuthController";
import { EntrenamientosController } from "@/controllers/WorkoutsController";
import {
  ProgresoController,
  type MetricaGrafico,
} from "@/controllers/ProgressController";
import { RutinasController } from "@/controllers/RoutinesController";
import type { Entrenamiento } from "@/models/entities/Workout";
import type { ProgresoFisico } from "@/models/entities/PhysicalProgress";
import type { Rutina } from "@/models/entities/Routine";
import type { ConId } from "@/models/types";
import { useErrorDeCarga } from "@/hooks/useLoadError";
import { useAuthStore } from "@/store/auth.store";
import type { ResultadoAccion } from "@/types/actionResult";

const OK: ResultadoAccion = { ok: true };

/**
 * Controlador de la pantalla Progreso (capa de orquestación): se suscribe a
 * registros, perfil, rutinas y entrenamientos, mantiene el estado del
 * formulario y expone los datos ya derivados. La Vista solo pinta.
 */
export function useProgresoScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { error, intento, reportar, reintentar } = useErrorDeCarga();

  // ── Peso / IMC ──────────────────────────────────────────────────────
  const [registros, setRegistros] = useState<ConId<ProgresoFisico>[]>([]);
  const [alturaPerfil, setAlturaPerfil] = useState<number | undefined>();
  const [cargando, setCargando] = useState(true);
  const [metricaGrafico, setMetricaGrafico] = useState<MetricaGrafico>("peso");

  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ── Rutinas / entrenamientos ─────────────────────────────────────────
  const [rutinaActivaId, setRutinaActivaId] = useState<string | null>(null);
  const [rutinas, setRutinas] = useState<ConId<Rutina>[]>([]);
  const [entrenamientos, setEntrenamientos] = useState<ConId<Entrenamiento>[]>(
    [],
  );
  const [marcandoEntreno, setMarcandoEntreno] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let activo = true;

    const alFallar = (origen: string) => (causa: Error) => {
      if (activo) reportar(origen, causa);
    };

    const unsubRegistros = ProgresoController.observar(
      uid,
      (lista) => {
        setRegistros(lista);
        setCargando(false);
      },
      alFallar("progreso"),
    );
    const unsubPerfil = AuthController.observarPerfil(
      uid,
      (perfil) => {
        if (!activo) return;
        if (perfil?.altura) {
          setAlturaPerfil(perfil.altura);
          setAltura((actual) => actual || String(perfil.altura));
        }
        setRutinaActivaId(perfil?.rutinaActivaId ?? null);
      },
      alFallar("perfil"),
    );
    const unsubRutinas = RutinasController.observar(
      uid,
      setRutinas,
      alFallar("rutinas"),
    );
    const unsubEntrenos = EntrenamientosController.observar(
      uid,
      setEntrenamientos,
      alFallar("entrenamientos"),
    );

    return () => {
      activo = false;
      unsubRegistros();
      unsubPerfil();
      unsubRutinas();
      unsubEntrenos();
    };
  }, [uid, intento, reportar]);

  // ── Datos derivados ──────────────────────────────────────────────────
  const rutinaActiva = rutinas.find((r) => r.id === rutinaActivaId) ?? null;

  const resumenEntrenos = useMemo(
    () => EntrenamientosController.resumen(entrenamientos),
    [entrenamientos],
  );
  const diaCompletadoHoy = useMemo(
    () => EntrenamientosController.deHoy(entrenamientos)?.dia ?? null,
    [entrenamientos],
  );

  const ultimoRegistro = registros[registros.length - 1] ?? null;
  const categoriaIMC = ProgresoController.categoriaIMC(ultimoRegistro?.imc);
  const diferenciaPeso = useMemo(
    () => ProgresoController.diferenciaPeso(registros),
    [registros],
  );

  const serie = useMemo(
    () => ProgresoController.armarSerieGrafico(registros, metricaGrafico),
    [registros, metricaGrafico],
  );
  // Forma que espera `react-native-chart-kit`.
  const datosGrafico = useMemo(
    () => ({ labels: serie.labels, datasets: [{ data: serie.valores }] }),
    [serie],
  );

  // ── Acciones ─────────────────────────────────────────────────────────
  const registrar = useCallback(async (): Promise<ResultadoAccion> => {
    if (!uid) return OK;
    setGuardando(true);
    try {
      const resultado = await ProgresoController.registrarDesdeTexto(
        uid,
        peso,
        altura,
        alturaPerfil,
      );
      if (resultado.ok) setPeso("");
      return resultado;
    } catch (error) {
      console.error("Error al registrar progreso:", error);
      return {
        ok: false,
        titulo: "Error",
        mensaje: "No se pudo guardar tu registro.",
      };
    } finally {
      setGuardando(false);
    }
  }, [uid, peso, altura, alturaPerfil]);

  const eliminar = useCallback(
    async (registroId: string): Promise<ResultadoAccion> => {
      if (!uid) return OK;
      try {
        await ProgresoController.eliminar(uid, registroId);
        return OK;
      } catch (error) {
        console.error("Error al eliminar registro:", error);
        return {
          ok: false,
          titulo: "Error",
          mensaje: "No se pudo eliminar el registro.",
        };
      }
    },
    [uid],
  );

  const alternarDia = useCallback(
    async (numeroDia: number): Promise<ResultadoAccion> => {
      if (!uid || !rutinaActiva) return OK;
      setMarcandoEntreno(true);
      try {
        if (diaCompletadoHoy === numeroDia) {
          await EntrenamientosController.desmarcarHoy(uid);
        } else {
          await EntrenamientosController.marcarCompletadoHoy(
            uid,
            rutinaActiva.id,
            numeroDia,
          );
        }
        return OK;
      } catch (error) {
        console.error("Error al marcar el entrenamiento:", error);
        return {
          ok: false,
          titulo: "Error",
          mensaje: "No se pudo actualizar tu entrenamiento de hoy.",
        };
      } finally {
        setMarcandoEntreno(false);
      }
    },
    [uid, rutinaActiva, diaCompletadoHoy],
  );

  return {
    // estado de carga
    cargando,
    error,
    reintentar,
    // peso / IMC
    registros,
    ultimoRegistro,
    categoriaIMC,
    diferenciaPeso,
    metricaGrafico,
    setMetricaGrafico,
    datosGrafico,
    diferenciaMetrica: serie.diferencia,
    estadisticasGrafico: serie.estadisticas,
    // formulario
    peso,
    setPeso,
    altura,
    setAltura,
    guardando,
    // rutinas / entrenamientos
    rutinaActiva,
    resumenEntrenos,
    diaCompletadoHoy,
    marcandoEntreno,
    // acciones
    registrar,
    eliminar,
    alternarDia,
  };
}
