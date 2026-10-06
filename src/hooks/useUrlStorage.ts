import { useEffect, useState } from "react";

import { MaquinasController } from "@/controllers/MaquinasController";

/**
 * Convierte una ruta de Storage del catálogo en URL de descarga.
 * Devuelve `undefined` mientras carga y `null` si no hay ruta o falló.
 */
export function useUrlStorage(ruta: string | null | undefined) {
  const [resultado, setResultado] = useState<{
    ruta: string | null | undefined;
    url: string | null;
  }>({ ruta: undefined, url: null });

  useEffect(() => {
    if (!ruta) return;
    let activo = true;
    MaquinasController.obtenerUrl(ruta)
      .then((url) => activo && setResultado({ ruta, url }))
      .catch((error) => {
        console.warn(
          "No se pudo obtener la imagen",
          ruta,
          error?.code ?? error,
        );
        if (activo) setResultado({ ruta, url: null });
      });
    return () => {
      activo = false;
    };
  }, [ruta]);

  if (!ruta) return null;
  // Mientras no llegue la URL de ESTA ruta, se considera "cargando".
  return resultado.ruta === ruta ? resultado.url : undefined;
}
