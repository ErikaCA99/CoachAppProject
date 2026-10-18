import type { ProgresoFisico } from "@/models/entities/ProgresoFisico";
import {
  actualizarProgreso,
  eliminarProgreso,
  listarProgreso,
  observarProgreso,
  registrarProgreso,
} from "@/models/repositories/progresoRepository";
import { actualizarPerfilUsuario } from "@/models/repositories/usuarioRepository";
import {
  actualizarProgresoSchema,
  registrarProgresoSchema,
} from "@/schemas/progreso.schema";
import type { ConId } from "@/models/types";
import {
  calcularIMC,
  clasificarIMC,
  type BmiCategory,
} from "@/utils/imcCalculator";

export interface ResultadoRegistroProgreso {
  imc: number | null;
  categoria: BmiCategory | null;
}

export type MetricaGrafico = "peso" | "imc";

export interface EstadisticasGrafico {
  minimo: number;
  promedio: number;
  maximo: number;
}

/** Serie lista para graficar. Las estadísticas y la diferencia usan TODO el historial. */
export interface SerieGrafico {
  labels: string[];
  valores: number[];
  estadisticas: EstadisticasGrafico | null;
  /** Último valor − primer valor, o `null` con menos de 2 registros. */
  diferencia: number | null;
}

/** Resultado de validar el formulario "Registrar peso" (texto crudo de los inputs). */
export type ResultadoFormularioProgreso =
  { ok: true } | { ok: false; titulo: string; mensaje: string };

/** Máximo de puntos visibles en el gráfico de evolución. */
const MAX_PUNTOS_GRAFICO = 8;

function formatearFechaCorta(fecha: Date): string {
  return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

function calcularEstadisticas(valores: number[]): EstadisticasGrafico | null {
  if (valores.length === 0) return null;
  const promedio = valores.reduce((acc, v) => acc + v, 0) / valores.length;
  return {
    minimo: Number(Math.min(...valores).toFixed(1)),
    promedio: Number(promedio.toFixed(1)),
    maximo: Number(Math.max(...valores).toFixed(1)),
  };
}

/**
 * Controlador (capa de negocio) para el seguimiento de progreso físico
 * (peso a lo largo del tiempo, graficado en la pestaña "Progreso").
 * La Vista solo llama a este controlador; nunca importa el repositorio
 * ni `imcCalculator` directamente.
 */
export const ProgresoController = {
  async registrar(
    usuarioId: string,
    peso: number,
    altura?: number,
    notas?: string,
  ): Promise<ResultadoRegistroProgreso> {
    const validacion = registrarProgresoSchema.safeParse({
      peso,
      altura,
      notas,
    });
    if (!validacion.success) {
      throw new Error(
        `Datos de progreso inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    const imc = validacion.data.altura
      ? calcularIMC(validacion.data.peso, validacion.data.altura)
      : undefined;
    const categoria = imc ? clasificarIMC(imc) : null;

    await registrarProgreso(usuarioId, {
      usuarioId,
      peso: validacion.data.peso,
      altura: validacion.data.altura,
      imc,
      notas: validacion.data.notas,
    });

    // El último peso registrado pasa a ser el peso actual del perfil: de él
    // dependen la meta calórica (Nutrición) y las entradas del modelo de
    // rutinas. Si falla, el registro de progreso ya quedó guardado.
    try {
      await actualizarPerfilUsuario(usuarioId, {
        pesoActual: validacion.data.peso,
        ...(validacion.data.altura ? { altura: validacion.data.altura } : {}),
      });
    } catch (error) {
      console.warn("No se pudo actualizar el peso del perfil:", error);
    }

    return { imc: imc ?? null, categoria };
  },

  /** Actualiza parcialmente un registro de progreso existente. */
  async actualizar(
    usuarioId: string,
    registroId: string,
    datos: { peso?: number; altura?: number; notas?: string },
  ): Promise<void> {
    const validacion = actualizarProgresoSchema.safeParse(datos);
    if (!validacion.success) {
      throw new Error(
        `Datos de actualización inválidos: ${validacion.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    const datosActualizados: Partial<ProgresoFisico> = { ...validacion.data };

    // Recalcular IMC si se proporcionó peso y/o altura
    if (
      validacion.data.peso !== undefined ||
      validacion.data.altura !== undefined
    ) {
      // Para recalcular el IMC necesitamos ambos valores; si solo se actualiza uno,
      // el otro ya debe estar en el registro existente (responsabilidad de la Vista).
      if (
        validacion.data.peso !== undefined &&
        validacion.data.altura !== undefined
      ) {
        datosActualizados.imc = calcularIMC(
          validacion.data.peso,
          validacion.data.altura,
        );
      }
    }

    await actualizarProgreso(usuarioId, registroId, datosActualizados);
  },

  async listar(usuarioId: string): Promise<ConId<ProgresoFisico>[]> {
    return listarProgreso(usuarioId);
  },

  observar: observarProgreso,

  async eliminar(usuarioId: string, registroId: string): Promise<void> {
    return eliminarProgreso(usuarioId, registroId);
  },

  // ── Reglas de presentación de datos (puras, sin Firebase) ───────────────

  /** Categoría de IMC de un valor, o `null` si no hay IMC. */
  categoriaIMC(imc?: number | null): BmiCategory | null {
    return imc ? clasificarIMC(imc) : null;
  },

  /** Cambio de peso entre el primer y el último registro (`null` con < 2). */
  diferenciaPeso(registros: ConId<ProgresoFisico>[]): number | null {
    if (registros.length < 2) return null;
    const primero = registros[0];
    const ultimo = registros[registros.length - 1];
    return Number((ultimo.peso - primero.peso).toFixed(1));
  },

  /**
   * Serie del gráfico de evolución para la métrica elegida. El IMC solo
   * incluye registros que lo tienen (los que se guardaron con altura).
   */
  armarSerieGrafico(
    registros: ConId<ProgresoFisico>[],
    metrica: MetricaGrafico,
  ): SerieGrafico {
    const puntos = registros.flatMap((r) => {
      const valor = metrica === "peso" ? r.peso : r.imc;
      if (typeof valor !== "number") return [];
      return [{ valor, fecha: r.creadoEn ?? null }];
    });

    const valores = puntos.map((p) => p.valor);
    const visibles = puntos.slice(-MAX_PUNTOS_GRAFICO);
    return {
      labels: visibles.map((p) =>
        p.fecha ? formatearFechaCorta(p.fecha) : "",
      ),
      valores: visibles.map((p) => p.valor),
      estadisticas: calcularEstadisticas(valores),
      diferencia:
        valores.length < 2
          ? null
          : Number((valores[valores.length - 1] - valores[0]).toFixed(1)),
    };
  },

  /** Texto de fecha de un registro para el historial. */
  fechaLegible(registro: ConId<ProgresoFisico>): string {
    return registro.creadoEn
      ? registro.creadoEn.toLocaleDateString()
      : "Fecha no disponible";
  },

  /**
   * Valida el formulario de peso/altura (texto de los inputs) y registra.
   * La altura vacía cae en la del perfil. Devuelve el mensaje a mostrar si
   * la validación falla; los errores inesperados se propagan (`throw`).
   */
  async registrarDesdeTexto(
    usuarioId: string,
    pesoTexto: string,
    alturaTexto: string,
    alturaPerfil?: number,
  ): Promise<ResultadoFormularioProgreso> {
    const peso = parseFloat(pesoTexto);
    const altura = parseFloat(alturaTexto) || alturaPerfil;

    if (!(peso > 0)) {
      return {
        ok: false,
        titulo: "Falta el peso",
        mensaje: "Ingresa tu peso actual en kg.",
      };
    }

    await ProgresoController.registrar(usuarioId, peso, altura);
    return { ok: true };
  },
};
