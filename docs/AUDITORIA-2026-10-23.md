# Informe de auditoría de coach-app

Fecha: 23 de octubre de 2026 · UMSS · Revisión del árbol de trabajo local.

## Actualización de correcciones — 24 de octubre de 2026

La revisión posterior corrigió el registro de sesiones sin ejercicios completados (A02), el recálculo del IMC en actualizaciones parciales (A03) y los errores de tipos, lint y formato observados en el árbol actual (A14). Los resúmenes distinguen sesiones parciales y vacías, y la lógica de series rechaza avances durante el descanso, incluso ante pulsaciones rápidas. El ID real de Firestore prevalece ahora sobre cualquier campo `id` almacenado; esto no sustituye la validación completa pendiente en A09. También se rechazan probabilidades no finitas o fuera de rango en la inferencia.

Se integraron 12 GIFs autorizados en ocho fichas mediante un mapeo local explícito, con imágenes estáticas y controles de reproducción. Su carpeta es `src/media/exercises`: el alias especial `@/assets` de la configuración vigente apunta a la carpeta raíz `assets`, por lo que no se utiliza para esos recursos.

La carga nativa de TensorFlow Lite se difiere hasta solicitar inferencia, para que su ausencia se pueda manejar mediante el respaldo existente. Las implementaciones `.web.ts` evitan cargar Nitro en el navegador/servidor: se conserva la heurística de rutinas y la selección manual de máquinas.

Comprobaciones posteriores: TypeScript aprobado; ESLint aprobado con `--max-warnings 0`; Prettier aprobado; **13 suites y 123 pruebas aprobadas** usando caché local, exclusiones CLI para carpetas de skills y `NODE_OPTIONS=--experimental-vm-modules` para la prueba de importación dinámica. La **exportación web completa aprobó** con `npx expo export -p web --max-workers 0 --output-dir .expo/verified-web`. La escritura final requirió ejecutar el comando fuera del aislamiento: dentro de él, Windows devolvía `EPERM` al crear directorios de salida, incluso tras compilar y generar las páginas. No se publicó la aplicación ni se modificaron `package.json`, `app.json` o `tsconfig.json`.

Los hallazgos que no se mencionan como corregidos en esta actualización conservan su estado pendiente; el cuerpo siguiente es el registro histórico de la auditoría inicial. La compilación web no sustituye pruebas con cámara, inferencia y navegación en un dispositivo Android real.

## Dictamen

La aplicación tiene una estructura por capas reconocible, rutas protegidas centralmente, integración real con TensorFlow Lite y una suite de pruebas que ya existe. No corresponde describirla como un prototipo sin IA ni tests. Todavía hay problemas de integridad, recuperación ante fallos y calidad que impiden considerarla completamente verificada para una entrega Android.

Esta es una auditoría estática transversal acompañada de comprobaciones automáticas. No es una certificación de seguridad, una prueba de penetración, una validación de la eficacia del entrenamiento ni una comprobación de Firebase desplegado. Los hallazgos pendientes se separan de las animaciones implementadas. Había numerosos cambios locales anteriores a esta revisión; se conservaron.

## Alcance y cobertura

- **Bienvenida, acceso y registro:** rutas públicas, formularios, Google, recuperación de contraseña, creación de perfil y sincronización de sesión. Referencias: `src/app/index.tsx`, `src/app/(auth)/`, `src/controllers/AuthController.ts`, hooks de autenticación.
- **Onboarding:** objetivo, nivel, datos físicos, elección de rutina y Zustand. Referencias: `src/app/(onboarding)/`, `src/store/onboarding.store.ts`, `src/schemas/user.schema.ts`.
- **Inicio y perfil:** resumen, rutina activa, racha, accesos rápidos y actualización de datos. Referencias: `src/app/(app)/index.tsx`, `profile.tsx`, `src/components/home/`.
- **Máquinas:** catálogo, búsqueda/filtros, detalle, demostraciones, imágenes de Storage, escáner, permisos, sugerencias y confirmación manual. Referencias: `src/app/(app)/machines/`, `src/components/machines/`, `MachinesController.ts`.
- **Rutinas:** generación, personalización, edición, activación y repositorios. Referencias: `src/app/(app)/routines/`, `RoutinesController.ts`, esquemas y utilidades de rutinas.
- **Entrenamiento guiado:** series, descansos, omisiones, resumen y registro diario. Referencias: `train.tsx`, `useGuidedWorkout.ts`, `workoutSession.ts`, `WorkoutsController.ts`.
- **Nutrición:** alimentos USDA, búsquedas cancelables, registro manual, metas e IMC. Referencias: `nutrition.tsx`, `NutritionController.ts`, `useFoodSearch.ts`, servicios USDA.
- **Progreso y reportes:** observadores, gráficos, historial, cálculo de resúmenes y exportación PDF. Referencias: `progress/index.tsx`, `useProgressScreen.ts`, `ProgressController.ts`, `ReportsController.ts`, `progressReport.ts`.
- **Transversal:** navegación, componentes UI, accesibilidad estática, persistencia, servicios Firebase, reglas locales, integraciones wger/ExerciseDB, IA, configuración y pruebas existentes.

La cobertura significa inspección de puntos de entrada, flujos principales y componentes/servicios relacionados; no significa ejecución exhaustiva de cada interacción ni revisión formal de cada línea.

## Animaciones implementadas

1. **Botones principales:** compresión hasta 0,98 en 90 ms y recuperación en 150 ms. Las pulsaciones interrumpen la transición anterior; los botones ocupados o deshabilitados vuelven a escala normal. Mantienen su etiqueta accesible durante la carga.
2. **Tarjetas de máquinas:** la misma respuesta progresiva al pulsar, reemplazando el salto instantáneo de escala.
3. **Entrada de contenido:** opacidad y desplazamiento de 8 unidades durante 220 ms en la tarjeta principal de Inicio, los estados vacíos/errores reutilizables y el resumen de entrenamiento. No se modifican dimensiones ni se añaden demoras por elemento de una lista.
4. **Navegación:** transiciones explícitas en las pilas de rutinas y máquinas; raíz y onboarding también atienden la preferencia de movimiento reducido.
5. **Avisos:** conservan la entrada breve y ahora respetan movimiento reducido. Cambiar esa preferencia no reinicia el tiempo de lectura del aviso.
6. **Generación de rutina:** los bucles existentes reaccionan a cambios de la preferencia del sistema y recuperan una postura estática cuando se desactivan.

Implementación compartida: `src/hooks/useReducedMotion.ts`, `src/hooks/usePressAnimation.ts` y `src/components/ui/AnimatedEntrance.tsx`. Usa `Animated` de React Native, driver nativo, limpieza de animaciones/suscripciones y una preferencia inicial conservadora mientras responde el sistema. No se instalaron dependencias ni se modificaron `package.json`, `app.json` o `tsconfig.json` en este trabajo.

Esto no afirma que todos los controles de la aplicación estén animados: existen otros botones con estados `active:` y GIFs educativos cuyo comportamiento se debe evaluar por separado.

## Hallazgos pendientes, ordenados por prioridad

### A01 · Alta · Las reglas aceptan datos fuera del contrato del cliente

**Evidencia:** `firestore.rules:53`, `:73`, `:90` y `:105`. El perfil permite altura/peso positivos sin los límites superiores de Zod; la rutina comprueba que `planSemanal` sea una lista, pero no su contenido; nutrición no limita macros; varias colecciones permiten crear sin exigir `creadoEn == request.time`. No se restringen las claves admitidas.

**Impacto:** un cliente modificado puede escribir datos propios que la UI y los cálculos no esperan. La comprobación de dueño sí está presente: esto no demuestra acceso a datos ajenos.

**Acción propuesta:** alinear tipos, rangos, claves y timestamps con los esquemas, definir una representación validable de los planes y agregar pruebas de reglas en emulador. Deben comprobarse documentos válidos de IMC e ingesta por separado; el acceso a campos ausentes en las dos variantes requiere pruebas específicas. No se desplegaron reglas durante esta auditoría.

### A02 · Alta · Se puede registrar como completada una sesión con todos los ejercicios omitidos

**Evidencia:** `src/utils/workoutSession.ts:90` avanza y termina al omitir el último ejercicio. `src/hooks/useGuidedWorkout.ts:148` registra el día sin comprobar ejercicios realizados. El resumen presenta el día como completado.

**Reproducción derivada del código:** abrir un día, saltar todos sus ejercicios y guardar desde el resumen. La misma operación de completado se ejecuta que tras realizar todas las series.

**Impacto:** racha, adherencia y reportes pueden reflejar una sesión sin actividad. Además, `finalizar` devuelve éxito cuando faltan uid/rutina/día.

**Acción propuesta:** definir estados de sesión completa/parcial/omitida, impedir completado con cero actividad y devolver un error explícito si no existen los datos para guardar.

### A03 · Media · Actualizar solo peso o altura puede dejar un IMC incoherente

**Evidencia:** `src/controllers/ProgressController.ts:117`. La API acepta ambas propiedades como opcionales, pero recalcula `imc` únicamente cuando llegan las dos.

**Impacto:** un consumidor que actualice solo el peso puede conservar un IMC calculado con el peso anterior. Es un defecto del contrato del controlador, aunque la pantalla actual no exponga todas esas actualizaciones.

**Acción propuesta:** leer el registro, combinar valores existentes y nuevos y recalcular antes de persistir; cubrir ambos cambios parciales con pruebas.

### A04 · Media · Un error al leer el perfil se interpreta como onboarding pendiente

**Evidencia:** `src/hooks/useProfileListener.ts:37` fija `perfilCompleto` a `false` ante un error. El guard raíz usa ese valor para elegir grupo de pantallas.

**Impacto:** una cuenta ya configurada puede terminar en onboarding por un fallo de permisos/servicio. No se distingue perfil inexistente de lectura fallida.

**Acción propuesta:** representar carga/error/perfil inexistente por separado y ofrecer reintento sin reemplazar el último perfil confirmado.

### A05 · Media · Inicio puede mostrar ausencia de datos cuando una lectura falló

**Evidencia:** `src/app/(app)/index.tsx:46` suscribe perfil, rutinas y entrenamientos sin callback de error. `src/services/firebase/firestoreService.ts:99` entrega vacío cuando no existe ese callback.

**Impacto:** un fallo puede convertirse visualmente en “Aún no tienes una rutina” o racha vacía, aunque los datos existan.

**Acción propuesta:** emplear el estado de error/reintento ya disponible en otras pantallas y diferenciarlo del estado vacío. Evitar transformar errores de acceso en datos vacíos para consumidores que necesitan fidelidad.

### A06 · Media · Guardar la rutina y activarla son operaciones separadas

**Evidencia:** `src/controllers/RoutinesController.ts:132` y `:184` crean la rutina y después actualizan el perfil.

**Impacto:** si la segunda escritura falla, la rutina ya existe pero el flujo informa fallo; reintentar puede crear otra copia.

**Acción propuesta:** encapsular escritura conjunta en la capa Firebase/repositorios con batch o usar un identificador idempotente y recuperación explícita de activación.

### A07 · Media · El IMC calculado puede ocultar un fallo de persistencia

**Evidencia:** `src/controllers/NutritionController.ts:249` captura el error de guardado y devuelve el cálculo sin indicar que no quedó almacenado.

**Impacto:** la persona puede confiar en que encontrará ese registro en su historial, aunque solo vio un resultado local.

**Acción propuesta:** devolver estado de persistencia junto al cálculo y ofrecer reintento, conservando el resultado visible.

### A08 · Media · Consultas históricas sin límites ni paginación

**Evidencia:** `src/services/firebase/firestoreService.ts:153` y `:193` ordenan pero no ofrecen `limit`/cursores/filtros de período. `src/controllers/ReportsController.ts` carga todo el historial antes de resumir el período seleccionado.

**Impacto:** a medida que crecen nutrición, progreso y entrenamientos aumentan lecturas, memoria y trabajo del cliente. Es un riesgo de escala; no se midieron latencias ni costes reales.

**Acción propuesta:** consultas por rango en repositorios, paginación para historial y agregados cuando el volumen lo justifique.

### A09 · Media · Lecturas de Firestore confían en una conversión de tipos

**Evidencia:** `src/services/firebase/firestoreService.ts:37` convierte timestamps de primer nivel y aplica `as ConId<T>` sin validar la forma recibida. `limpiarUndefined` limpia solo propiedades de primer nivel.

**Impacto:** documentos heredados, escritos por seed o permitidos por reglas laxas pueden llegar a controladores con forma incompatible. Objetos anidados con `undefined` pueden seguir siendo rechazados al escribir. No se afirma que haya documentos corruptos actualmente.

**Acción propuesta:** validar entidades en el límite de repositorio, identificar registros incompatibles y decidir explícitamente el tratamiento de valores anidados.

### A10 · Media · Accesibilidad de formularios incompleta

**Evidencia:** `src/components/ui/TextField.tsx:30` muestra una etiqueta visual pero no establece por defecto `accessibilityLabel` en el input; el ojo de contraseña tiene un área visual estrecha (`right-3`) y no declara rol de botón. Los errores de campo se representan como texto sin región viva.

**Impacto:** el nombre del campo puede depender del placeholder o de las props de cada consumidor, y controles pequeños dificultan su uso. Es una observación estática; falta comprobar TalkBack, foco y tamaño efectivo en dispositivo.

**Acción propuesta:** etiqueta accesible predeterminada sobreescribible, rol/estado para mostrar contraseña, área táctil de 48 dp en Android y anuncio/foco de errores. Comprobar texto grande y teclado en formularios y modales.

### A11 · Media · Las métricas de IA requieren interpretación y validación de campo

**Evidencia:** `ml/train_routine_model.py:60` y `:102` generan datos sintéticos y etiquetas derivadas de reglas. `ml/results/metrics.json` informa 99,78 % de exactitud conjunta sobre ese conjunto. `ml/results/recognition/recognition_metrics.json` informa top-1 de 38,53 % en “campo_simulado”; con umbral 0,8, precisión de 85,41 % y cobertura de 15,83 %.

**Impacto:** las métricas del recomendador expresan reproducción de las reglas sintéticas, no eficacia física en usuarios; las del escáner tampoco son una medición en gimnasio real. La confirmación manual existente es una protección útil, pero la mayoría de capturas no cumple ese umbral.

**Acción propuesta:** reportar procedencia y limitaciones en el documento académico, validar con datos independientes y evaluar falsas detecciones antes de aumentar automatización. No se reentrenó ningún modelo ni se verificó inferencia Android en esta sesión.

### A12 · Media · La eliminación de perfil no equivale a eliminación de cuenta y datos

**Evidencia:** `src/controllers/AuthController.ts:226` llama a `eliminarPerfilUsuario`; este elimina únicamente el documento `usuarios/{uid}`. No se observó un flujo integral de eliminación desde `profile.tsx`.

**Impacto:** usar ese método como “eliminar cuenta” dejaría identidad de Auth y documentos de subcolecciones. El método actual se llama eliminarPerfil, por lo que se registra como carencia del ciclo de vida de cuenta, no como engaño de una opción visible existente.

**Acción propuesta:** diseñar eliminación autenticada y coordinada de identidad, datos y archivos propios, con recuperación de fallos y reautenticación cuando proceda.

### A13 · Baja · Storage autoriza lectura en todo el bucket a cualquier usuario autenticado

**Evidencia:** `storage.rules:10` usa `/{allPaths=**}` con lectura autenticada y escritura denegada.

**Impacto:** es compatible con un bucket dedicado al catálogo actual, pero nuevos archivos privados también quedarían legibles si se guardaran allí bajo esas reglas.

**Acción propuesta:** limitar lectura a prefijos de catálogo antes de introducir contenido privado. No hay evidencia de archivos privados expuestos en el bucket real.

### A14 · Media · Los controles de calidad del árbol actual aún fallan

**Evidencia:** ESLint detecta dos errores en `src/hooks/useGuidedWorkout.ts` (pureza en `useRef(Date.now())` e inicialización síncrona de sesión en efecto) y dos advertencias: import `Entrenamiento` sin uso en ese hook y redeclaración de `TextInput` en `src/components/ui/Typography.tsx`. Prettier detecta formato pendiente en `src/utils/__tests__/typography.test.ts`.

**Impacto:** el árbol no cumple el criterio del proyecto de cero errores/advertencias y formato correcto. Estos puntos ya estaban en código previo al trabajo de animaciones; se dejaron documentados sin reestructurar la sesión guiada ni archivos ajenos al cambio.

**Acción propuesta:** corregir el ciclo de vida de la sesión manteniendo su requisito de no reiniciarse con actualizaciones de rutina, resolver nombres/imports y formatear ese test. Repetir después la secuencia completa de validación.

### A15 · Baja · Documentación y ejecución estándar de pruebas desfasadas

**Evidencia:** `AGENTS.md` describe IA y Jest como pendientes; el árbol contiene modelos `.tflite`, servicios de inferencia, `jest-expo` y diez suites. `npm test -- --runInBand` encontró colisión de nombres entre scripts de skills de `.agents` y `.kiro`, además de permisos de caché temporal en este entorno.

**Impacto:** otra sesión puede omitir pruebas existentes o repetir una configuración innecesaria. La colisión no está relacionada con los módulos de la app.

**Acción propuesta:** actualizar la documentación al estado verificado y ajustar exclusiones/caché de Jest cuando se autorice tocar su configuración. En esta revisión se usaron argumentos CLI sin modificar configuración.

### A16 · Baja · La consulta alternativa de animaciones no fija tiempo máximo

**Evidencia:** `src/services/exercisedb/exerciseDbService.ts:29` recibe cancelación del consumidor pero no establece plazo de respuesta. En contraste, wger y USDA sí fijan timeout.

**Impacto:** una consulta que no termina puede mantener el indicador hasta que se cambie de fuente o se abandone la pantalla.

**Acción propuesta:** combinar cancelación del consumidor con un timeout y permitir reintento. La validación Zod y la restricción de host HTTPS ya presentes son puntos favorables.

## Fortalezas verificadas por inspección

- `Stack.Protected` concentra el acceso por sesión y perfil; los archivos de ruta exportan sus pantallas por defecto.
- Las búsquedas de imports no muestran uso directo del SDK Firebase en pantallas. Los repositorios encapsulan las rutas privadas y los servicios concentran el acceso Firestore/Storage.
- Las reglas locales comprueban dueño en datos privados y deniegan escritura de catálogos desde cliente. No se comprobaron las reglas publicadas.
- Los observadores principales liberan suscripciones; hay componentes reutilizables de error, estado vacío y avisos.
- La búsqueda de alimentos tiene debounce, cancelación y mensajes diferenciados de errores. wger y USDA fijan tiempos máximos de red.
- La integración ExerciseDB valida su respuesta, exige host HTTPS conocido y usa correspondencia exacta; conserva el mapeo manual existente.
- El generador de reportes escapa texto incorporado al HTML. Las lecturas independientes del reporte se hacen en paralelo.
- La inferencia de rutinas tiene respaldo heurístico; el escáner ofrece selección manual cuando no hay modelo o confianza suficiente.
- Las diez suites existentes contienen 106 pruebas que pasan con los argumentos de ejecución indicados abajo.

## Validación ejecutada

1. `npx tsc --noEmit`: aprobado, sin diagnósticos.
2. `npx eslint .`: no aprobado; el resultado final conserva los dos errores y dos advertencias descritos en A14. Los componentes y hooks de animación se corrigieron durante la revisión sin desactivar reglas.
3. `npx prettier --check "src/**/*.{ts,tsx}"`: no aprobado por `src/utils/__tests__/typography.test.ts`, archivo previo ajeno al cambio. Los archivos de animación editados se formatearon.
4. `npx expo export -p web`: **inconcluso**. Inició Metro/static rendering y no devolvió bundle ni diagnóstico de compilación durante la ejecución observada; se interrumpió. El reintento con `npx expo export -p web --max-workers 2` volvió a quedar sin progreso después de iniciar Metro y también se interrumpió. Se observaron advertencias de entorno `NO_COLOR`/`FORCE_COLOR`. No hay evidencia suficiente para atribuir la demora a un módulo concreto ni para aprobar el empaquetado.

Comprobación adicional: Prettier sobre los 14 archivos de implementación creados/editados para las animaciones aprobó. `git diff --check` no detectó errores de whitespace; mostró avisos de normalización CRLF/LF. La comprobación final adicional de TypeScript terminó con código 0.

Pruebas adicionales: `npm test -- --runInBand --no-cache --cacheDirectory .expo/jest-audit --modulePathIgnorePatterns '[\\/]\.(agents|kiro)[\\/]'`: **10 suites y 106 pruebas aprobadas**. El comando estándar falló inicialmente por caché temporal/colisión de skills; no se atribuye ese fallo a la lógica de las pruebas. Estas pruebas no cubren renderizado visual de animaciones ni reglas Firebase.

## Secuencia de trabajo sugerida

1. Resolver A14 para restablecer la puerta de calidad; endurecer y probar reglas A01; definir cómo contar entrenamientos A02.
2. Corregir coherencia de IMC A03, recuperación de perfil A04/A05 y persistencia A06/A07.
3. Validar accesibilidad A10 y modelos A11 en un build Android; incorporar pruebas de integración de esos flujos.
4. Abordar paginación A08, validación de lectura A09, ciclo de cuenta A12 y límites de almacenamiento A13.
5. Actualizar documentación/pruebas A15 y timeout A16.

## Validación manual aún necesaria

- Android: pulsaciones rápidas/canceladas, botón deshabilitado durante animación, navegación hacia atrás y cambio de “quitar animaciones” mientras se usa la app.
- Pantalla pequeña y horizontal: tarjeta de Inicio, resumen, modales, teclado y texto grande; TalkBack y orden de foco.
- Acceso real: email, Google, recuperación, perfil inexistente, permisos denegados y desconexión/reconexión.
- Entrenamiento: omitir todo/parcial, cerrar app y reabrir, descanso en segundo plano y guardado fallido.
- Cámara e IA: permisos permanentes denegados, distintas máquinas/luces/ángulos, disponibilidad nativa del modelo.
- Nutrición/progreso/reportes: ambas variantes de documento, altas/bajas, límites numéricos, PDF generado y hoja de compartir en Android.
- Emulador Firebase: acceso cruzado entre usuarios, rangos, campos desconocidos, variantes de nutrición y timestamps; comprobar posteriormente las reglas efectivamente desplegadas.

No se realizaron mediciones de FPS, auditoría de dependencias remotas, pruebas con cuentas reales, publicación de reglas ni un build nativo. La exportación web por sí sola no sustituye esas comprobaciones.
