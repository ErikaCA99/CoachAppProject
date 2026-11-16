# CoachApp

Aplicación Android de entrenamiento para gimnasios, proyecto de grado UMSS.
Stack: Expo SDK 57, React Native, TypeScript, Expo Router y Firebase.

## Funcionalidades actuales

- Autenticación, perfil y configuración inicial.
- Catálogo de máquinas, instrucciones, riesgos y demostraciones de ejercicios.
- Generación de rutinas con planificador y TensorFlow Lite, edición y sesiones.
- Registro nutricional, búsqueda de alimentos, IMC y reportes de progreso.
- Reconocimiento con TensorFlow Lite local o Ultralytics mediante Firebase Functions.
- Etiquetas espaciales con ARCore en Android compatible y cámara convencional como alternativa.

OpenAI no está integrado. El reconocimiento depende de las clases del modelo y puede requerir confirmación manual.

## Desarrollo

Usar npm e instalar las dependencias de app y backend:

```powershell
npm ci
npm ci --prefix functions
```

Configurar `.env` a partir de `.env.example`, sin versionar credenciales.
Android requiere `google-services.json` local o la variable de archivo `GOOGLE_SERVICES_JSON` en EAS.
Las claves privadas de proveedores permanecen en el servidor.

Los módulos nativos de ARCore, TensorFlow Lite, Google Sign-In y App Check requieren un cliente de desarrollo. Expo Go no contiene estos módulos.

```powershell
npm run android
npx expo start --dev-client
```

Para web: `npm run web`.

El reconocimiento en nube se activa con `EXPO_PUBLIC_RECONOCIMIENTO_NUBE=true`.
El backend necesita `ULTRALYTICS_ENDPOINT_URL` y el secreto `ULTRALYTICS_API_KEY`.
Si falla la llamada, la app recurre al modelo local; también permite selección manual.

## Estructura

MVC por funcionalidad sobre arquitectura cliente-servidor (detalle en `src/README.md`):

- `src/app/`: rutas de Expo Router (Vista de entrada).
- `src/features/<funcionalidad>/`: `model/` (entidades, reglas, esquemas, repositorios), `api/` (cliente-servidor), `controller/` (casos de uso y hooks), `view/` (componentes) e `index.ts` (API pública de dominio).
- `src/core/`: infraestructura compartida (Firebase, HTTP, errores, almacenamiento local, validación).
- `src/shared/`: UI reutilizable, tema y utilidades genéricas.
- `src/store/` y `src/config/`: estado global y configuración/entorno.
- `modules/coach-ar/`: módulo nativo Android de realidad aumentada.
- `functions/`: backend Firebase y sus pruebas.
- `tests/security/`: pruebas de reglas y autorización.
- `ml/`: entrenamiento, evaluación y datos; excluidos del paquete EAS.
- `assets/`: imágenes, modelos incluidos en la app (`models/`) y demostraciones de ejercicios (`exercises/`).

## Verificación

Ejecutar en este orden:

```powershell
npx tsc --noEmit
npx eslint . --max-warnings 0
npx prettier --check "src/**/*.{ts,tsx}"
npx expo export -p web
npm test -- --runInBand
npm run test:backend
npm run test:security
```

Las pruebas de seguridad necesitan Java y los emuladores de Firebase.
El flujo `.github/workflows/backend-security.yml` ejecuta estas verificaciones.
Comprobar además el empaquetado Android con `npx expo export -p android`.

En este equipo Windows se usa JDK 22. Si Java falla con
`Unable to establish loopback connection`, configurar solo la terminal actual:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-22'
$env:Path="$env:JAVA_HOME/bin;$env:Path"
$env:JAVA_TOOL_OPTIONS='"-Djdk.net.unixdomain.tmpdir=D:/UMSS/APLICACION MOVIL PROYECTO DE GRADA/coach-app/_tmp/java-unix-no-disponible"'
```

La ruta `java-unix-no-disponible` debe permanecer inexistente para que Java use
la alternativa TCP. No crear esa carpeta ni trasladar este ajuste local a EAS.

Antes de distribuir un APK, probar en Android real: sesión, permisos denegados,
rutinas, entrenamientos, nutrición, reportes, reconocimiento con y sin conexión
y retorno desde segundo plano. Para ARCore, mover el teléfono durante la
respuesta del servidor, confirmar una candidata alternativa y comprobar anclaje
y recolocación. Una caja 2D no determina distancia: sin geometría válida se
necesita colocación manual.

## Compilación y despliegue

`eas.json` define perfiles de desarrollo, preview APK y producción.
Los cambios nativos requieren recompilar el cliente; una OTA no puede añadirlos
a un APK anterior. Firebase se despliega por separado. Compilar la app no
confirma que el backend remoto esté configurado o actualizado.

Las salidas `dist/`, `.expo/`, `_tmp/` y cachés de Gradle se pueden regenerar.
Conservar fuentes nativas locales, modelos, datos de entrenamiento, configuración
y pruebas para reproducir la versión. No borrar dependencias durante el desarrollo.

## Estado verificado el 3 de noviembre de 2026

- TypeScript, ESLint sin advertencias y formato aprobados.
- Exportaciones web y Android/Hermes completadas.
- 156 pruebas de app, 22 de backend y 15 de seguridad aprobadas.
- Módulo ARCore compilado; sus 5 pruebas JVM de geometría aprobadas.
- Sin teléfono conectado: quedan pendientes las pruebas físicas de cámara,
  seguimiento AR y funcionamiento contra los servicios remotos desplegados.

Estas verificaciones corresponden al código local; no certifican un despliegue
remoto ni sustituyen las pruebas de aceptación en Android real.
