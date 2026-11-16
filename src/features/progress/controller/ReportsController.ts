import { formatearFechaISO } from "@/features/workout";
import { listarEntrenamientos } from "@/features/workout/model/repositories/workoutRepository";
import { listarRegistrosNutricion } from "@/features/nutrition/model/repositories/nutritionRepository";
import { listarProgreso } from "@/features/progress/model/repositories/progressRepository";
import { obtenerPerfilUsuario } from "@/features/profile/model/repositories/userRepository";
import {
  compartirPdf,
  generarPdfDesdeHtml,
} from "@/features/progress/api/pdfService";
import { calcularMetasNutricionales } from "@/features/nutrition";
import {
  calcularResumenReporte,
  generarHtmlReporte,
  PERIODOS_REPORTE,
  type PeriodoReporte,
  type ResumenReporte,
} from "@/features/progress/model/rules/progressReport";

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
