import { listarEntrenamientos } from "@/models/repositories/workoutRepository";
import { listarRegistrosNutricion } from "@/models/repositories/nutritionRepository";
import { listarProgreso } from "@/models/repositories/progressRepository";
import { obtenerPerfilUsuario } from "@/models/repositories/userRepository";
import {
  compartirPdf,
  generarPdfDesdeHtml,
} from "@/services/reports/pdfService";
import { calcularMetasNutricionales } from "@/utils/nutritionGoals";
import {
  calcularResumenReporte,
  generarHtmlReporte,
  PERIODOS_REPORTE,
  type PeriodoReporte,
  type ResumenReporte,
} from "@/utils/progressReport";

export { PERIODOS_REPORTE, type PeriodoReporte };

/**
 * Controlador (capa de negocio) de reportes personalizados de progreso (OE7).
 * Reúne perfil, peso, entrenamientos y alimentación del usuario, calcula el
 * resumen del período y genera un PDF que se puede guardar o compartir.
 */
export const ReportesController = {
  /** Lee los datos del usuario y calcula el resumen (sin generar el PDF). */
  async calcularResumen(
    usuarioId: string,
    periodo: PeriodoReporte,
  ): Promise<ResumenReporte> {
    const [perfil, progreso, nutricion, entrenamientos] = await Promise.all([
      obtenerPerfilUsuario(usuarioId),
      listarProgreso(usuarioId),
      listarRegistrosNutricion(usuarioId),
      listarEntrenamientos(usuarioId),
    ]);

    return calcularResumenReporte({
      perfil,
      progreso,
      nutricion,
      entrenamientos,
      metas: calcularMetasNutricionales(perfil),
      periodo,
    });
  },

  /** Genera el PDF del período y abre la hoja de compartir. */
  async generarYCompartir(
    usuarioId: string,
    periodo: PeriodoReporte,
  ): Promise<ResumenReporte> {
    const resumen = await ReportesController.calcularResumen(
      usuarioId,
      periodo,
    );
    const uri = await generarPdfDesdeHtml(generarHtmlReporte(resumen));
    await compartirPdf(uri, "Reporte de progreso físico");
    return resumen;
  },
};
