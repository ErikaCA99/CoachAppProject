import { create, type AxiosInstance } from "axios";

/**
 * Fábrica del cliente HTTP para APIs REST públicas (wger…). Centraliza la
 * configuración común de red: todo cliente nace con un tiempo de espera
 * acotado. Es el lugar para añadir interceptores (cabeceras, reintentos,
 * normalización de errores) sin tocar cada servicio.
 *
 * Las Cloud Functions no pasan por aquí: usan `core/http/callable.ts`, donde
 * el SDK añade los tokens de Auth y App Check.
 */
export function crearClienteHttp(
  baseURL: string,
  {
    timeoutMs = 15000,
    params,
  }: { timeoutMs?: number; params?: Record<string, string> } = {},
): AxiosInstance {
  return create({ baseURL, timeout: timeoutMs, params });
}
