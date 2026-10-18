import { useState } from "react";

import { RutinasController } from "@/controllers/RutinasController";
import type { EjercicioWger } from "@/models/entities/EjercicioWger";
import type { DiaRutina } from "@/models/entities/Rutina";
import { useAuthStore } from "@/store/auth.store";
import type { ResultadoAccion } from "@/types/resultadoAccion";
import {
  MAX_DIAS_RUTINA,
  actualizarEnfoque as actualizarEnfoqueDia,
  agregarDia as agregarDiaVacio,
  agregarEjercicio as agregarEjercicioADia,
  crearDiaVacio,
  diaActivoTrasQuitar,
  ejercicioDesdeWger,
  quitarDia as quitarDiaDe,
  quitarEjercicio as quitarEjercicioDe,
} from "@/utils/editorRutina";

/**
 * Controlador del editor de rutina personalizada (capa de orquestación):
 * guarda el borrador (nombre, días, ejercicios, día activo) y delega las
 * reglas de edición en `utils/editorRutina`. La Vista solo pinta y navega.
 */
export function useEditorRutinaPersonalizada() {
  const uid = useAuthStore((s) => s.user?.uid);

  const [nombreRutina, setNombreRutina] = useState("Mi rutina personalizada");
  const [dias, setDias] = useState<DiaRutina[]>([crearDiaVacio(1)]);
  const [diaActivo, setDiaActivo] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const diaSeleccionado = dias[diaActivo];
  const puedeAgregarDia = dias.length < MAX_DIAS_RUTINA;
  const puedeQuitarDia = dias.length > 1;

  const agregarDia = () => {
    if (!puedeAgregarDia) return;
    setDias(agregarDiaVacio);
    setDiaActivo(dias.length); // el día recién creado
  };

  const quitarDia = (indice: number) => {
    if (!puedeQuitarDia) return;
    setDias((prev) => quitarDiaDe(prev, indice));
    setDiaActivo((prev) => diaActivoTrasQuitar(prev, indice, dias.length - 1));
  };

  const actualizarEnfoque = (texto: string) =>
    setDias((prev) => actualizarEnfoqueDia(prev, diaActivo, texto));

  const agregarEjercicio = (ejercicio: EjercicioWger) =>
    setDias((prev) =>
      agregarEjercicioADia(prev, diaActivo, ejercicioDesdeWger(ejercicio)),
    );

  const quitarEjercicio = (indiceEjercicio: number) =>
    setDias((prev) => quitarEjercicioDe(prev, diaActivo, indiceEjercicio));

  /** Valida y guarda la rutina como activa. La Vista navega si `ok`. */
  const guardar = async (): Promise<ResultadoAccion> => {
    if (!uid) {
      return {
        ok: false,
        titulo: "Sesión requerida",
        mensaje: "Inicia sesión para guardar tu rutina.",
      };
    }

    const aviso = RutinasController.validarBorradorPersonalizado(
      nombreRutina,
      dias,
    );
    if (aviso) return { ok: false, ...aviso };

    setGuardando(true);
    try {
      await RutinasController.crearRutinaPersonalizada(
        uid,
        nombreRutina.trim(),
        dias,
      );
      return { ok: true };
    } catch (error) {
      console.error("Error al guardar rutina personalizada:", error);
      return {
        ok: false,
        titulo: "Error",
        mensaje: "No se pudo guardar tu rutina. Intenta de nuevo.",
      };
    } finally {
      setGuardando(false);
    }
  };

  return {
    nombreRutina,
    setNombreRutina,
    dias,
    diaActivo,
    setDiaActivo,
    diaSeleccionado,
    puedeAgregarDia,
    puedeQuitarDia,
    guardando,
    agregarDia,
    quitarDia,
    actualizarEnfoque,
    agregarEjercicio,
    quitarEjercicio,
    guardar,
  };
}
