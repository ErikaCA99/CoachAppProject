import { EjerciciosWgerController } from "@/controllers/EjerciciosWgerController";
import type {
  DiaRutina,
  EjercicioRutina,
  Rutina,
} from "@/models/entities/Rutina";
import { OBJETIVOS_USUARIO } from "@/models/entities/Usuario";
import type {
  NivelExperiencia,
  ObjetivoUsuario,
} from "@/models/entities/Usuario";
import {
  actualizarRutina,
  eliminarRutina,
  guardarRutina,
  listarRutinas,
  obtenerRutina,
  observarRutinas,
} from "@/models/repositories/rutinaRepository";
import {
  actualizarPerfilUsuario,
  obtenerPerfilUsuario,
} from "@/models/repositories/usuarioRepository";
import {
  actualizarRutinaSchema,
  crearRutinaPersonalizadaSchema,
  ejercicioRutinaSchema,
  generarRutinaIASchema,
} from "@/schemas/rutina.schema";
import type { ConId } from "@/services/firebase/firestoreService";
import {
  generarPlanHeuristico,
  repartirCantidad,
  type BloqueDia,
  type ParametrosSerie,
} from "@/utils/generadorRutinas";

/** Elige `cantidad` elementos al azar de `items` (sin repetir), preservando variedad entre días. */
function elegirAleatorios<T>(items: T[], cantidad: number): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, cantidad);
}

async function armarDia(
  numeroDia: number,
  bloque: BloqueDia,
  parametros: ParametrosSerie,
): Promise<DiaRutina> {
  const cantidades = repartirCantidad(
    bloque.cantidadEjercicios,
    bloque.categoriasIds.length,
  );

  const resultadosPorCategoria = await Promise.all(
    bloque.categoriasIds.map((categoriaId) =>
      EjerciciosWgerController.listar({ categoriaId }),
    ),
  );

  const ejercicios: EjercicioRutina[] = [];
  resultadosPorCategoria.forEach((resultado, indice) => {
    const seleccionados = elegirAleatorios(resultado.items, cantidades[indice]);
    seleccionados.forEach((maquina) => {
      ejercicios.push({
        maquinaId: maquina.id,
        nombre: maquina.nombre,
        imagenUrl: maquina.imagenUrl,
        series: parametros.series,
        repeticiones: parametros.repeticiones,
        descansoSegundos: parametros.descansoSegundos,
      });
    });
  });

  return { dia: numeroDia, enfoque: bloque.enfoque, ejercicios };
}

/**
 * Controlador (capa de negocio) para generación y gestión de rutinas.
 * La Vista (`(app)/routines/*`) solo llama a este controlador; nunca
 * importa Firestore, wger ni la heurística directamente.
 */
export const RutinasController = {
  /** Genera una rutina heurística (IA) real, usando ejercicios de wger, y la guarda como activa. */
  async generarRutinaConIA(
    usuarioId: string,
    objetivo: ObjetivoUsuario,
    nivel: NivelExperiencia,
  ): Promise<string> {
    const validacion = generarRutinaIASchema.safeParse({ objetivo, nivel });
    if (!validacion.success) {
      throw new Error(
        `Parámetros de generación inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    const plan = generarPlanHeuristico(
      validacion.data.objetivo,
      validacion.data.nivel,
    );

    const planSemanal = await Promise.all(
      plan.bloques.map((bloque, indice) =>
        armarDia(indice + 1, bloque, plan.parametrosSerie),
      ),
    );

    const rutina: Omit<Rutina, "creadoEn"> = {
      nombre: `Rutina IA · ${OBJETIVOS_USUARIO[validacion.data.objetivo].etiqueta}`,
      tipo: "ia",
      objetivo: validacion.data.objetivo,
      nivel: validacion.data.nivel,
      diasPorSemana: plan.diasPorSemana,
      planSemanal,
      usuarioId,
    };

    const rutinaId = await guardarRutina(usuarioId, rutina);
    await actualizarPerfilUsuario(usuarioId, { rutinaActivaId: rutinaId });
    return rutinaId;
  },

  /** Guarda una rutina armada a mano por el usuario y la marca como activa. */
  async crearRutinaPersonalizada(
    usuarioId: string,
    nombre: string,
    planSemanal: DiaRutina[],
  ): Promise<string> {
    const validacion = crearRutinaPersonalizadaSchema.safeParse({
      nombre,
      planSemanal,
    });
    if (!validacion.success) {
      throw new Error(
        `Datos de rutina inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    const rutina: Omit<Rutina, "creadoEn"> = {
      nombre: validacion.data.nombre,
      tipo: "personalizada",
      diasPorSemana: validacion.data.planSemanal.length,
      planSemanal: validacion.data.planSemanal,
      usuarioId,
    };

    const rutinaId = await guardarRutina(usuarioId, rutina);
    await actualizarPerfilUsuario(usuarioId, { rutinaActivaId: rutinaId });
    return rutinaId;
  },

  async listar(usuarioId: string): Promise<ConId<Rutina>[]> {
    return listarRutinas(usuarioId);
  },

  async obtener(
    usuarioId: string,
    rutinaId: string,
  ): Promise<ConId<Rutina> | null> {
    return obtenerRutina(usuarioId, rutinaId);
  },

  async eliminar(usuarioId: string, rutinaId: string): Promise<void> {
    return eliminarRutina(usuarioId, rutinaId);
  },

  observar: observarRutinas,

  /** Actualiza parcialmente una rutina existente (nombre y/o plan semanal). */
  async actualizar(
    usuarioId: string,
    rutinaId: string,
    datos: { nombre?: string; planSemanal?: DiaRutina[] },
  ): Promise<void> {
    const validacion = actualizarRutinaSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de actualización inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    const datosActualizados: Partial<Rutina> = { ...validacion.data };
    if (validacion.data.planSemanal) {
      datosActualizados.diasPorSemana = validacion.data.planSemanal.length;
    }
    await actualizarRutina(usuarioId, rutinaId, datosActualizados);
  },

  /** Rutina marcada como activa en el perfil, o `null` si no hay ninguna. */
  async obtenerActiva(usuarioId: string): Promise<ConId<Rutina> | null> {
    const perfil = await obtenerPerfilUsuario(usuarioId);
    if (!perfil?.rutinaActivaId) return null;
    return obtenerRutina(usuarioId, perfil.rutinaActivaId);
  },

  /**
   * Agrega un ejercicio al final de un día de la rutina (p. ej. desde la
   * ficha de una máquina). Lanza error si el día no existe o si el ejercicio
   * ya está en ese día.
   */
  async agregarEjercicioADia(
    usuarioId: string,
    rutinaId: string,
    numeroDia: number,
    ejercicio: EjercicioRutina,
  ): Promise<void> {
    const validacion = ejercicioRutinaSchema.safeParse(ejercicio);
    if (!validacion.success) {
      throw new Error(
        `Ejercicio inválido: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    const rutina = await obtenerRutina(usuarioId, rutinaId);
    if (!rutina) throw new Error("La rutina ya no existe.");

    const dia = rutina.planSemanal.find((d) => d.dia === numeroDia);
    if (!dia) throw new Error(`La rutina no tiene día ${numeroDia}.`);
    if (dia.ejercicios.some((e) => e.maquinaId === ejercicio.maquinaId)) {
      throw new Error("Ese ejercicio ya está en este día.");
    }

    const planSemanal = rutina.planSemanal.map((d) =>
      d.dia === numeroDia
        ? { ...d, ejercicios: [...d.ejercicios, validacion.data] }
        : d,
    );
    await RutinasController.actualizar(usuarioId, rutinaId, { planSemanal });
  },

  async activar(usuarioId: string, rutinaId: string): Promise<void> {
    await actualizarPerfilUsuario(usuarioId, { rutinaActivaId: rutinaId });
  },
};
