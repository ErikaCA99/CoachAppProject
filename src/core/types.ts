/**
 * Documento de una colección con su id. Los modelos no guardan el id dentro
 * de los datos: lo agrega la capa de acceso al leer.
 */
export type ConId<T> = T & { id: string };
