import type { ProgresoFisico } from "@/models/entities/ProgresoFisico";
import {
  actualizarProgreso,
  eliminarProgreso,
  listarProgreso,
  observarProgreso,
  registrarProgreso,
} from "@/models/repositories/progresoRepository";
import {
  actualizarProgresoSchema,
  registrarProgresoSchema,
} from "@/schemas/progreso.schema";
import type { ConId } from "@/services/firebase/firestoreService";
import {
  calcularIMC,
  clasificarIMC,
  type BmiCategory,
} from "@/utils/imcCalculator";

export interface ResultadoRegistroProgreso {
  imc: number | null;
  categoria: BmiCategory | null;
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
};
