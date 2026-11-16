import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * Servicio nativo de documentos: convierte HTML en un PDF (expo-print) y
 * abre la hoja de compartir del sistema (expo-sharing) para guardarlo o
 * enviarlo. Sin conocimiento de dominio: no sabe qué es un "reporte".
 */
export async function generarPdfDesdeHtml(html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function compartirPdf(
  uri: string,
  titulo = "Compartir PDF",
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Este dispositivo no permite compartir archivos.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: titulo,
  });
}
