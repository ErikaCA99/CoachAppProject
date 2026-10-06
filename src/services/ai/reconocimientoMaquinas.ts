/**
 * Reconocimiento de máquinas por cámara — PUNTO DE EXTENSIÓN.
 *
 * Todavía no hay modelo entrenado (TensorFlow Lite está pendiente; ver
 * AGENTS.md). Mientras tanto, `reconocerMaquina` devuelve `null` y el
 * escáner le pide al usuario que confirme la máquina en una lista.
 *
 * Cuando exista el modelo, esta es la única función que hay que implementar:
 * recibir la foto, clasificarla y devolver el id del catálogo (`maquinas/{id}`)
 * con su confianza. Las clases del modelo deben ser los 35 ids del catálogo.
 *
 * Importante: los términos de WorkoutX prohíben entrenar modelos con sus GIFs
 * sin permiso escrito; el dataset debe salir de otras fotos (con permiso).
 */

export interface ResultadoReconocimiento {
  maquinaId: string;
  /** 0..1 */
  confianza: number;
}

/** Umbral mínimo para aceptar una predicción sin pedir confirmación. */
export const CONFIANZA_MINIMA = 0.7;

export async function reconocerMaquina(
  _fotoUri: string,
): Promise<ResultadoReconocimiento | null> {
  return null;
}
