import {
  addDoc,
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
} from "firebase/firestore";

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
function aModelo<T>(id: string, datos: DocumentData): ConId<T> {
  const convertidos: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    convertidos[clave] = valor instanceof Timestamp ? valor.toDate() : valor;
  }
  return { id, ...convertidos } as ConId<T>;
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
  onError?: (error: FirestoreError) => void,
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
): Promise<ConId<T> | null> {
  const snapshot = await getDoc(doc(db, coleccionPath, id));
  if (!snapshot.exists()) return null;
  return aModelo<T>(snapshot.id, snapshot.data());
}

/** Lista todos los documentos de una colección, opcionalmente ordenados. */
export async function listar<T>(
  coleccionPath: string,
  opciones: { ordenarPor?: string; direccion?: "asc" | "desc" } = {},
): Promise<ConId<T>[]> {
  const coleccionRef = collection(db, coleccionPath);
  const consulta = opciones.ordenarPor
    ? query(
        coleccionRef,
        orderBy(opciones.ordenarPor, opciones.direccion ?? "asc"),
      )
    : coleccionRef;

  const snapshot = await getDocs(consulta);
  return snapshot.docs.map((d) => aModelo<T>(d.id, d.data()));
}

/** Actualiza parcialmente un documento. Agrega `actualizadoEn` (server timestamp). */
export async function actualizar<T extends DocumentData>(
  coleccionPath: string,
  id: string,
  datos: Partial<T>,
): Promise<void> {
  await setDoc(
    doc(db, coleccionPath, id),
    {
      ...limpiarUndefined(datos),
      actualizadoEn: serverTimestamp(),
    },
    { merge: true },
  );
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
    onError?: (error: FirestoreError) => void;
  } = {},
): Unsubscribe {
  const coleccionRef = collection(db, coleccionPath);
  const consulta = opciones.ordenarPor
    ? query(
        coleccionRef,
        orderBy(opciones.ordenarPor, opciones.direccion ?? "asc"),
      )
    : coleccionRef;

  return onSnapshot(
    consulta,
    (snapshot) => {
      callback(snapshot.docs.map((d) => aModelo<T>(d.id, d.data())));
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
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, coleccionPath, id),
    (snapshot) => {
      callback(
        snapshot.exists() ? aModelo<T>(snapshot.id, snapshot.data()) : null,
      );
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
    onError?: (error: FirestoreError) => void;
  } = {},
): Unsubscribe {
  return observar<T>(
    `usuarios/${usuarioId}/${subcoleccion}`,
    callback,
    opciones,
  );
}
