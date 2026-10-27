import {
  addDoc,
  limit,
  startAfter,
  where,
  updateDoc,
  runTransaction,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "@firebase/firestore";

import type { ConId } from "@/models/types";
import { auth, db } from "@/services/firebase/firebase";

/**
 * Helpers genéricos de acceso a Firestore.
 *
 * Este es el ÚNICO archivo del proyecto que debe importar el SDK de
 * Firestore. Los repositorios (`src/models/repositories/`) llaman a estas
 * funciones pasando la ruta de colección (p. ej. `usuarios/{uid}/rutinas`);
 * nunca deben usar `collection`/`doc`/`getDocs` etc. directamente.
 */

/**
 * Arma el modelo de un documento: agrega el `id` y convierte los `Timestamp`
 * de primer nivel (`creadoEn`, `actualizadoEn`...) a `Date`, para que los
 * modelos, controladores y vistas no dependan del SDK de Firestore.
 * (Un `serverTimestamp()` aún sin resolver llega como `null` y se respeta.)
 */
function aModelo<T>(
  id: string,
  datos: DocumentData,
  validar?: (datos: unknown) => unknown,
): ConId<T> {
  const convertidos: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    convertidos[clave] = valor instanceof Timestamp ? valor.toDate() : valor;
  }
  const modelo = { ...convertidos, id };
  return (validar ? validar(modelo) : modelo) as ConId<T>;
}

/**
 * Quita las claves cuyo valor es `undefined`.
 *
 * Firestore RECHAZA cualquier campo con valor `undefined` explícito (lanza
 * `FirebaseError: Unsupported field value: undefined`) a menos que se active
 * `ignoreUndefinedProperties` al inicializar Firestore — algo que este
 * proyecto no hace a propósito (mejor fallar rápido que persistir basura).
 * En JS, `{ altura: undefined }` SÍ crea la clave `"altura"` (no es lo mismo
 * que omitirla), así que cualquier objeto armado con `campo: condicion ? x : undefined`
 * — un patrón común en los controladores de este proyecto — revienta al
 * guardar. Se limpia acá, en el único lugar que toca el SDK, para que
 * ningún repositorio tenga que acordarse de hacerlo por su cuenta.
 */
function limpiarUndefined<T extends object>(datos: T): T {
  const resultado = { ...datos } as Record<string, unknown>;
  for (const clave of Object.keys(resultado)) {
    if (resultado[clave] === undefined) {
      delete resultado[clave];
    }
  }
  return resultado as T;
}

/**
 * Decide qué hacer cuando un listener en tiempo real falla.
 *
 * Sin un `onError`, un error de `onSnapshot` (p. ej. `permission-denied`)
 * se reporta como "Uncaught Error in snapshot listener" y la pantalla se
 * queda esperando datos que nunca llegan (spinner infinito). Por eso:
 *  - Al cerrar sesión, Firestore reintenta los listeners activos sin
 *    credenciales y recibe `permission-denied` justo antes de que las
 *    pantallas se desmonten. Es esperado: se ignora en silencio (se entrega
 *    vacío) y NUNCA llega al `onError` de la pantalla.
 *  - Si el llamador pasó `onError`, recibe el error real y decide qué
 *    mostrar (así la UI distingue "falló la carga" de "no hay datos").
 *  - Si no lo pasó, se registra un aviso legible y se entrega vacío para que
 *    la UI salga del estado de carga (comportamiento histórico).
 */
function manejarErrorListener(
  ruta: string,
  error: FirestoreError,
  entregarVacio: () => void,
  onError?: (error: Error) => void,
): void {
  const esCierreDeSesion =
    error.code === "permission-denied" && !auth.currentUser;
  if (esCierreDeSesion) {
    entregarVacio();
    return;
  }
  if (onError) {
    onError(error);
    return;
  }
  console.warn(
    `[Firestore] Listener de "${ruta}" falló (${error.code}): ${error.message}`,
  );
  entregarVacio();
}

/** Crea un documento con ID autogenerado. Agrega `creadoEn` (server timestamp). */
export async function crear<T extends DocumentData>(
  coleccionPath: string,
  datos: T,
): Promise<string> {
  const ref = await addDoc(collection(db, coleccionPath), {
    ...limpiarUndefined(datos),
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Crea (o sobrescribe) un documento con un ID explícito.
 * Útil para colecciones donde el ID de documento debe coincidir con algo
 * externo (p. ej. `usuarios/{uid}` donde el ID es el UID de Firebase Auth).
 */
export async function crearConId<T extends DocumentData>(
  coleccionPath: string,
  id: string,
  datos: T,
  opciones: { merge?: boolean } = {},
): Promise<void> {
  const datosLimpios = limpiarUndefined(datos);
  // Si es un merge sobre un doc que ya podría existir, no pisamos su
  // `creadoEn` original con un timestamp nuevo.
  const payload = opciones.merge
    ? datosLimpios
    : { ...datosLimpios, creadoEn: serverTimestamp() };

  await setDoc(doc(db, coleccionPath, id), payload, {
    merge: opciones.merge ?? false,
  });
}

/** Obtiene un documento por ID. Devuelve `null` si no existe. */
export async function obtenerPorId<T>(
  coleccionPath: string,
  id: string,
  validar?: (datos: unknown) => unknown,
): Promise<ConId<T> | null> {
  const snapshot = await getDoc(doc(db, coleccionPath, id));
  if (!snapshot.exists()) return null;
  return aModelo<T>(snapshot.id, snapshot.data(), validar);
}

export interface OpcionesConsulta {
  ordenarPor?: string;
  direccion?: "asc" | "desc";
  desde?: Date | string;
  hasta?: Date | string;
  validar?: (datos: unknown) => unknown;
}

function restricciones(opciones: OpcionesConsulta): QueryConstraint[] {
  const campo = opciones.ordenarPor ?? "creadoEn";
  const filtros: QueryConstraint[] = [];
  if (opciones.desde !== undefined)
    filtros.push(where(campo, ">=", opciones.desde));
  if (opciones.hasta !== undefined)
    filtros.push(where(campo, "<=", opciones.hasta));
  if (opciones.ordenarPor)
    filtros.push(orderBy(campo, opciones.direccion ?? "asc"));
  return filtros;
}

/** Paginación por cursor; nunca devuelve un informe silenciosamente truncado. */
export async function listar<T>(
  coleccionPath: string,
  opciones: OpcionesConsulta = {},
): Promise<ConId<T>[]> {
  const resultados: ConId<T>[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    const filtros = restricciones(opciones);
    if (cursor) filtros.push(startAfter(cursor));
    const pagina = await getDocs(
      query(collection(db, coleccionPath), ...filtros, limit(500)),
    );
    resultados.push(
      ...pagina.docs.map((d) => aModelo<T>(d.id, d.data(), opciones.validar)),
    );
    if (resultados.length > 10000)
      throw new Error(
        "Demasiados registros. Selecciona un período más corto para el reporte.",
      );
    if (pagina.size < 500) return resultados;
    cursor = pagina.docs[pagina.docs.length - 1];
  }
}

/** Upsert transaccional: preserva creadoEn al volver a marcar un entrenamiento. */
export async function guardarConFecha<T extends DocumentData>(
  ruta: string,
  id: string,
  datos: T,
): Promise<void> {
  const referencia = doc(db, ruta, id);
  await runTransaction(db, async (transaccion) => {
    const anterior = await transaccion.get(referencia);
    transaccion.set(
      referencia,
      anterior.exists()
        ? {
            ...limpiarUndefined(datos),
            creadoEn: anterior.data().creadoEn,
            actualizadoEn: serverTimestamp(),
          }
        : { ...limpiarUndefined(datos), creadoEn: serverTimestamp() },
    );
  });
}

/** Actualiza parcialmente un documento. Agrega `actualizadoEn` (server timestamp). */
export async function actualizar<T extends DocumentData>(
  coleccionPath: string,
  id: string,
  datos: Partial<T>,
): Promise<void> {
  await updateDoc(doc(db, coleccionPath, id), {
    ...limpiarUndefined(datos),
    actualizadoEn: serverTimestamp(),
  });
}

/** Elimina un documento por ID. */
export async function eliminar(
  coleccionPath: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, coleccionPath, id));
}

/**
 * Suscribe a los cambios en tiempo real de una colección.
 * Devuelve la función `unsubscribe` para llamar en el cleanup del efecto.
 */
export function observar<T>(
  coleccionPath: string,
  callback: (items: ConId<T>[]) => void,
  opciones: {
    ordenarPor?: string;
    direccion?: "asc" | "desc";
    desde?: Date | string;
    hasta?: Date | string;
    validar?: (datos: unknown) => unknown;
    onError?: (error: Error) => void;
  } = {},
): Unsubscribe {
  const consulta = query(
    collection(db, coleccionPath),
    ...restricciones(opciones),
    limit(500),
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      try {
        callback(
          snapshot.docs.map((d) =>
            aModelo<T>(d.id, d.data(), opciones.validar),
          ),
        );
      } catch (error) {
        opciones.onError?.(
          error instanceof Error ? error : new Error("Datos inválidos"),
        );
      }
    },
    (error) =>
      manejarErrorListener(
        coleccionPath,
        error,
        () => callback([]),
        opciones.onError,
      ),
  );
}

/** Suscribe a los cambios en tiempo real de un único documento. */
export function observarDocumento<T>(
  coleccionPath: string,
  id: string,
  callback: (item: ConId<T> | null) => void,
  onError?: (error: Error) => void,
  validar?: (datos: unknown) => unknown,
): Unsubscribe {
  return onSnapshot(
    doc(db, coleccionPath, id),
    (snapshot) => {
      try {
        callback(
          snapshot.exists()
            ? aModelo<T>(snapshot.id, snapshot.data(), validar)
            : null,
        );
      } catch (error) {
        onError?.(
          error instanceof Error ? error : new Error("Datos inválidos"),
        );
      }
    },
    (error) =>
      manejarErrorListener(
        `${coleccionPath}/${id}`,
        error,
        () => callback(null),
        onError,
      ),
  );
}

/** Azúcar sintáctica para observar una subcolección privada de un usuario. */
export function observarPorUsuario<T>(
  usuarioId: string,
  subcoleccion: string,
  callback: (items: ConId<T>[]) => void,
  opciones: {
    ordenarPor?: string;
    direccion?: "asc" | "desc";
    desde?: Date | string;
    hasta?: Date | string;
    validar?: (datos: unknown) => unknown;
    onError?: (error: Error) => void;
  } = {},
): Unsubscribe {
  return observar<T>(
    `usuarios/${usuarioId}/${subcoleccion}`,
    callback,
    opciones,
  );
}
