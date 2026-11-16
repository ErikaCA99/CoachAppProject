import { EjerciciosWgerController } from "@/features/exercises/controller/WgerExercisesController";
import type { EjercicioWger } from "@/features/exercises";
import type {
  DiaRutina,
  EjercicioRutina,
  Rutina,
} from "@/features/routines/model/entities/Routine";
import { OBJETIVOS_USUARIO } from "@/features/profile";
import type { NivelExperiencia, ObjetivoUsuario } from "@/features/profile";
import {
  actualizarRutina,
  eliminarRutina,
  guardarRutina,
  listarRutinas,
  obtenerRutina,
  observarRutinas,
} from "@/features/routines/model/repositories/routineRepository";
import {
  actualizarPerfilUsuario,
  obtenerPerfilUsuario,
} from "@/features/profile/model/repositories/userRepository";
import {
  actualizarRutinaSchema,
  crearRutinaPersonalizadaSchema,
  ejercicioRutinaSchema,
  generarRutinaIASchema,
} from "@/features/routines/model/schemas/routine.schema";
import type { ConId } from "@/core/types";
import { contarEjercicios } from "@/features/routines/model/rules/routineEditor";
import { planificarRutina } from "@/features/routines/model/ai/routinePlanner";
import {
  repartirCantidad,
  type BloqueDia,
  type ParametrosSerie,
} from "@/features/routines/model/rules/routineGenerator";

/** React Native usa AbortSignal sin el método web throwIfAborted. */
function verificarCancelacion(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error("Generación cancelada.");
    error.name = "AbortError";
    throw error;
  }
}

/** Elige `cantidad` elementos al azar de `items` (sin repetir), preservando variedad entre días. */
function elegirAleatorios<T>(items: T[], cantidad: number): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, cantidad);
}

/**
 * Elige `cantidad` ejercicios prefiriendo los que tienen imagen (la de wger o
 * la de respaldo en `ejerciciosWger`), para que la rutina se vea completa.
 * Si no alcanzan, completa con los que no la tienen (nunca deja el día corto).
 */
async function elegirConImagen(
  items: EjercicioWger[],
  cantidad: number,
  signal?: AbortSignal,
): Promise<EjercicioWger[]> {
  verificarCancelacion(signal);
  const tieneImagen = await Promise.all(
    items.map(async (item) =>
      item.imagenUrl
        ? true
        : (await EjerciciosWgerController.obtenerImagenRespaldo(item.id)) !==
          null,
    ),
  );
  verificarCancelacion(signal);
  const conImagen = items.filter((_, i) => tieneImagen[i]);
  const sinImagen = items.filter((_, i) => !tieneImagen[i]);
  const elegidos = elegirAleatorios(conImagen, cantidad);
  return elegidos.length < cantidad
    ? [...elegidos, ...elegirAleatorios(sinImagen, cantidad - elegidos.length)]
    : elegidos;
}

async function armarDia(
  numeroDia: number,
  bloque: BloqueDia,
  parametros: ParametrosSerie,
  signal?: AbortSignal,
): Promise<DiaRutina> {
  verificarCancelacion(signal);
  const cantidades = repartirCantidad(
    bloque.cantidadEjercicios,
    bloque.categoriasIds.length,
  );

  const resultadosPorCategoria = await Promise.all(
    bloque.categoriasIds.map((categoriaId) =>
      EjerciciosWgerController.listar({ categoriaId, signal }),
    ),
  );

  const seleccionadosPorCategoria = await Promise.all(
    resultadosPorCategoria.map((resultado, indice) =>
      elegirConImagen(resultado.items, cantidades[indice], signal),
    ),
  );

  const ejercicios: EjercicioRutina[] = [];
  seleccionadosPorCategoria.forEach((seleccionados) => {
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
  /** Genera un borrador en memoria. No guarda ni modifica la rutina activa. */
  async generarVistaPrevia(
    usuarioId: string,
    objetivo: ObjetivoUsuario,
    nivel: NivelExperiencia,
    signal?: AbortSignal,
  ): Promise<Omit<Rutina, "creadoEn">> {
    verificarCancelacion(signal);
    const validacion = generarRutinaIASchema.safeParse({ objetivo, nivel });
    if (!validacion.success) {
      throw new Error(
        `Parámetros de generación inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    // Datos físicos del perfil: entradas del modelo de IA (edad, IMC,
    // género, días disponibles). Si faltan, `construirFeatures` imputa.
    const perfil = await obtenerPerfilUsuario(usuarioId);
    verificarCancelacion(signal);
    const planificacion = await planificarRutina({
      objetivo: validacion.data.objetivo,
      nivel: validacion.data.nivel,
      genero: perfil?.genero,
      edad: perfil?.edad,
      altura: perfil?.altura,
      pesoActual: perfil?.pesoActual,
      diasDisponibles: perfil?.diasDisponibles,
    });
    const plan = planificacion.plan;
    verificarCancelacion(signal);

    const planSemanal = await Promise.all(
      plan.bloques.map((bloque, indice) =>
        armarDia(indice + 1, bloque, plan.parametrosSerie, signal),
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
      origenPlan: planificacion.origen,
      versionModelo: planificacion.versionModelo,
      confianzaModelo: planificacion.confianza,
    };

    verificarCancelacion(signal);
    if (planSemanal.some((dia) => dia.ejercicios.length === 0)) {
      throw new Error("No hay ejercicios suficientes para preparar la rutina.");
    }
    return rutina;
  },

  /** Guarda un borrador confirmado sin cambiar la rutina activa. */
  async guardarVistaPrevia(
    usuarioId: string,
    rutina: Omit<Rutina, "creadoEn">,
  ) {
    if (rutina.usuarioId !== usuarioId) throw new Error("Usuario inválido.");
    crearRutinaPersonalizadaSchema.parse(rutina);
    return guardarRutina(usuarioId, rutina);
  },

  /** Registra la rutina anterior en el momento de activar para poder deshacer. */
  async activarConAnterior(usuarioId: string, rutinaId: string) {
    const [anterior, nueva] = await Promise.all([
      RutinasController.obtenerActiva(usuarioId),
      obtenerRutina(usuarioId, rutinaId),
    ]);
    if (!nueva) throw new Error("La nueva rutina ya no existe.");
    await actualizarPerfilUsuario(usuarioId, { rutinaActivaId: rutinaId });
    return anterior;
  },

  async deshacerActivacion(
    usuarioId: string,
    nuevaId: string,
    anteriorId: string | null,
  ) {
    const perfil = await obtenerPerfilUsuario(usuarioId);
    if (perfil?.rutinaActivaId !== nuevaId) {
      throw new Error(
        "Tu rutina activa cambió. No se modificó tu selección actual.",
      );
    }
    if (anteriorId && !(await obtenerRutina(usuarioId, anteriorId))) {
      throw new Error("La rutina anterior ya no está disponible.");
    }
    await actualizarPerfilUsuario(usuarioId, { rutinaActivaId: anteriorId });
  },

  /**
   * Validación previa de lo que el usuario armó a mano (nombre y al menos un
   * ejercicio). Devuelve el aviso a mostrar, o `null` si se puede guardar.
   */
  validarBorradorPersonalizado(
    nombre: string,
    planSemanal: DiaRutina[],
  ): { titulo: string; mensaje: string } | null {
    if (!nombre.trim()) {
      return {
        titulo: "Falta el nombre",
        mensaje: "Ponle un nombre a tu rutina.",
      };
    }
    if (contarEjercicios(planSemanal) === 0) {
      return {
        titulo: "Sin ejercicios",
        mensaje: "Agrega al menos un ejercicio a algún día antes de guardar.",
      };
    }
    return null;
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
