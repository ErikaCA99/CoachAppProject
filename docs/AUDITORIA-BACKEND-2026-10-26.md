# Revisión del backend — 26 de octubre de 2026

## Alcance y conclusión

Revisión estática del código local, reglas de Firestore/Storage y configuración de despliegue. No se accedió a la consola de Firebase ni se modificaron servicios remotos. La separación entre controladores, repositorios y servicios está bien encaminada, pero hay puntos que deben corregirse antes de considerar el sistema listo para producción. Esta revisión no certifica ausencia de vulnerabilidades.

El backend actual es Firebase Authentication, Firestore y Storage. Los controladores y repositorios de `src/` se ejecutan en el dispositivo: organizan el código, pero sus validaciones no son una barrera de seguridad frente a un cliente modificado. La autorización efectiva depende de las reglas desplegadas en Firebase.

## Hallazgos priorizados

### 1. Prioridad alta: clave de USDA incluida en el cliente

Evidencia: `src/config/env.ts:31`, `src/config/env.ts:62` y `src/services/usda/usdaService.ts:67`.

El código toma `EXPO_PUBLIC_FOOD_DATA_API_KEY` y la envía directamente a USDA. Si se configura una clave real, estará incluida en el paquete de la aplicación y podrá extraerse. El uso no autorizado puede ocasionar bloqueo o desactivación de la clave y afectar la búsqueda de alimentos. No se inspeccionó ni publicó su valor.

Solución: trasladar la llamada a una Cloud Function o servicio equivalente, almacenar la clave como secreto del servidor, validar la identidad del usuario y los parámetros, limitar solicitudes y resultados, y aplicar controles contra abuso. Si una versión con esa clave ya se distribuyó, sustituirla después de migrar el cliente. Esto no implica que las claves públicas de configuración de Firebase sean secretos equivalentes.

Fuentes: [variables públicas de Expo](https://docs.expo.dev/guides/environment-variables/) y [responsabilidad de claves de USDA](https://fdc.nal.usda.gov/api-guide/).

### 2. Prioridad media: validación incompleta en Firestore

Evidencia: `firestore.rules:59`, `firestore.rules:79`, `firestore.rules:95` y `firestore.rules:111`.

Las reglas comprueban propiedad y parte de los tipos, pero no reproducen todas las restricciones del dominio. Por ejemplo, `planSemanal` solo debe ser una lista, y `diasPorSemana` puede ser un número fraccionario. Faltan listas de campos admitidos, límites de longitud, varios rangos y controles de fechas en subcolecciones. Un cliente modificado puede eludir Zod y persistir datos propios incompatibles con la app. `firestoreService.ts:37` convierte fechas y aplica un cast de TypeScript; no valida el documento leído.

Impacto observado por inspección: riesgo de integridad de los datos del propio usuario y errores en pantallas o reportes. No se demostró acceso a datos de otro usuario.

Solución: alinear reglas con los esquemas, exigir campos y tipos, limitar tamaños/rangos, proteger campos inmutables y fechas del servidor. Para estructuras anidadas complejas, adaptar el modelo para permitir validación efectiva o realizar las escrituras mediante una función con validación completa. Añadir pruebas con el emulador para accesos anónimos, entre usuarios, datos inválidos y operaciones válidas. Incluir los dos formatos de registros nutricionales y los campos opcionales.

Referencia: [validación de campos con reglas de Firestore](https://firebase.google.com/docs/firestore/security/rules-fields).

### 3. Endurecimiento: lectura de todo Storage para cualquier autenticado

Evidencia: `storage.rules:10` y `storage.rules:11`.

El comodín global permite leer cualquier ruta del bucket a todo usuario autenticado. Puede ser coherente si únicamente contiene imágenes compartidas del catálogo. No se verificó contenido privado expuesto. Sin embargo, no protege futuros archivos personales.

Solución: permitir lectura solo en las rutas destinadas al catálogo y definir propiedad por UID para cualquier contenido privado. Mantener prohibidas las escrituras del cliente a los catálogos.

### 4. Brecha de verificación y despliegue

No se encontraron `firebase.json`, `.firebaserc`, `firestore.indexes.json`, un paquete de Cloud Functions ni pruebas de reglas con `@firebase/rules-unit-testing`. No es posible asegurar que los archivos locales coincidan con las reglas activas: podrían haberse publicado manualmente.

Solución: versionar la configuración de despliegue, separar desarrollo y producción, verificar reglas en el emulador y publicar reglas e índices mediante un proceso reproducible. No se encontró inicialización de App Check en el cliente; evaluar su integración y verificar en consola la protección contra abuso antes de exigirla. App Check complementa las reglas y la autenticación.

### 5. Escalabilidad: lecturas de históricos completos

Evidencia: `src/controllers/ReportsController.ts:31` y `src/services/firebase/firestoreService.ts:151`.

Los reportes descargan los históricos de progreso, nutrición y entrenamientos antes de calcular el período. Los helpers de consulta revisados no ofrecen paginación ni filtro por intervalo. A medida que crezcan los datos aumentarán lecturas, memoria y latencia.

Solución: consultar por período y agregar paginación/límites donde corresponda, con sus índices. Es una mejora de rendimiento y costes; no demuestra una fuga de información.

## Aspectos positivos

- Repositorios separados de controladores y servicios de Firebase centralizados.
- Reglas de datos personales basadas en `request.auth.uid` y la ruta del propietario.
- Catálogos sin permiso de escritura desde el cliente.
- Firebase Authentication utilizado para autenticar usuarios.
- Validación Zod en operaciones de aplicación y marcas de tiempo del servidor en los helpers de persistencia.
- No se encontraron archivos de credenciales privadas entre los nombres de archivos actualmente versionados examinados. Esto no constituye una auditoría de todo el historial Git.

## Qué necesita despliegue

**No hace falta contratar un VPS ni desplegar los controladores de `src/` como servidor.** Firebase ya proporciona los servicios remotos. Deben configurarse Authentication y los recursos del proyecto, y desplegarse las reglas e índices correspondientes. Para proteger la clave USDA, añadir y desplegar una Cloud Function o servicio administrado equivalente.

Flujo recomendado: aplicación → Firebase Auth; aplicación → Firestore/Storage protegidos por reglas; aplicación → función autenticada → USDA con secreto del servidor.

El despliegue de una versión web sería independiente del backend. Entrenar YOLO en una computadora tampoco implica que haya que contratar un servidor para esta arquitectura; la necesidad de alojar inferencia depende de si finalmente se ejecuta en el dispositivo o en un servicio remoto.

Referencias: [Firebase CLI y despliegues](https://firebase.google.com/docs/cli#deployment), [funciones invocables](https://firebase.google.com/docs/functions/callable) y [App Check](https://firebase.google.com/docs/app-check).

## Comprobaciones y límites

Se inspeccionaron las rutas de acceso a datos, autenticación, reglas y configuración local. `npm audit --omit=dev --json` no pudo consultar avisos de seguridad: falló con `ENOTFOUND registry.npmjs.org`. Por tanto, las vulnerabilidades conocidas de dependencias quedan pendientes de comprobar. No se ejecutaron pruebas de reglas en un emulador ni ataques contra producción. Tampoco se verificaron IAM, restricciones de claves, reglas publicadas o configuración remota. No se modificó código de la aplicación ni se desplegó nada durante esta revisión.
