/**
 * Registro de que el usuario completó el entrenamiento de un día de su
 * rutina en una fecha de calendario concreta. Documento de
 * `usuarios/{usuarioId}/entrenamientos/{fecha}`: el ID del documento ES la
 * fecha en formato `YYYY-MM-DD` (hora local del dispositivo), así "marcar
 * como completado" siempre sobrescribe el mismo día y nunca duplica.
 *
 * Nota: `fecha` es un identificador de día de calendario (clave de
 * documento), no un sustituto de `creadoEn` — `creadoEn` sigue viniendo de
 * `serverTimestamp()` en el repositorio, como en el resto de la app.
 */
export interface Entrenamiento {
  usuarioId: string;
  rutinaId: string;
  /** Día del `planSemanal` (1..7) que se completó ese día de calendario. */
  dia: number;
  /** Fecha de calendario en formato `YYYY-MM-DD`. */
  fecha: string;
  creadoEn?: Date;
}
