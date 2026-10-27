import { formatearFechaISO } from "@/utils/workoutStats";
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
    const ahora = new Date();
    const hasta = new Date(ahora);
    hasta.setHours(23, 59, 59, 999);
    const desde = periodo === null ? undefined : new Date(ahora);
    if (desde) {
      desde.setDate(desde.getDate() - (periodo! - 1));
      desde.setHours(0, 0, 0, 0);
    }
    const [perfil, progreso, nutricion, entrenamientos] = await Promise.all([
      obtenerPerfilUsuario(usuarioId),
      listarProgreso(usuarioId, { desde, hasta }),
      listarRegistrosNutricion(usuarioId, { desde, hasta }),
      listarEntrenamientos(usuarioId, {
        desde: desde && formatearFechaISO(desde),
        hasta: formatearFechaISO(hasta),
      }),
    ]);

    return calcularResumenReporte({
      perfil,
      progreso,
      nutricion,
      entrenamientos,
      metas: calcularMetasNutricionales(perfil),
      periodo,
      ahora,
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
