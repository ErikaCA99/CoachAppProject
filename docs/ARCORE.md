# Reconocimiento y anclaje espacial Android

La vista `CoachAR` es un módulo local de Expo en `modules/coach-ar/`. Usa ARCore
1.52.0 directamente, sin Sceneform ni otra sesión de cámara simultánea. Expo lo
enlaza automáticamente desde `modules/`; su manifest declara AR como opcional.
No requiere claves de Google Cloud: las anclas son locales a la sesión.

## Flujo y coordenadas

1. ARCore captura la imagen CPU YUV y los intrínsecos de ese mismo frame. Crea
   un ancla temporal en la pose óptica de la cámara, con un identificador único.
2. Convierte a JPEG, rotándolo a la orientación de pantalla. La app lo reduce
   conservando la imagen completa y la relación de aspecto, sin recortes.
3. La Cloud Function solicita `normalize=false` al endpoint e interpreta `images[0].shape` como
   `[alto, ancho]` y devuelve `caja: {x1, y1, x2, y2}` en coordenadas 0..1.
   La caja corresponde a la instancia de mayor confianza de esa clase; no se
   promedian cajas de distintas máquinas. Si falta geometría válida, se omite.
4. El controlador conserva la caja de cada candidata. Al confirmar una,
   el escáner pasa únicamente su caja y su ficha a la vista nativa.
5. Kotlin deshace la rotación del JPEG y aplica los intrínsecos para convertir
   el centro de la caja en un rayo óptico. Transforma el rayo al espacio mundial
   con la pose del ancla temporal, no con la pose actual del teléfono. Esto evita
   confundir el frame capturado con el frame recibido tras la llamada de red.
6. ARCore hace un hit test desde ese rayo. Solo acepta geometría con seguimiento:
   planos dentro de su polígono, puntos con normal estimada o profundidad cuando
   está disponible, entre 0,15 y 8 metros. Crea un ancla sobre el impacto y libera
   el ancla temporal. La etiqueta con nombre e instrucción se proyecta cada frame
   usando las matrices de vista/proyección; se oculta si queda detrás/fuera de la
   cámara o se pierde el seguimiento.

Una caja 2D no determina por sí sola la distancia. Si no hay superficie en el
rayo, no se inventa una posición a distancia fija: se solicita tocar una
superficie junto a la máquina. También se coloca manualmente al entrar desde
una ficha, con un clasificador local sin cajas o con una captura vencida (90 s).
El ancla queda fija en el entorno; no sigue una máquina que se mueva físicamente.

## Compilación y activación

- Instalar las dependencias habituales con `npm install`.
- Compilar un nuevo cliente Android con `npm run android` o el perfil de
  desarrollo de EAS. Expo Go y un APK anterior no contienen `CoachAR`; una OTA
  no puede añadirlo. No es necesario regenerar Android para registrar el módulo
  si el proyecto ya usa el autolinking de Expo.
- Publicar los cambios del backend con
  `npx firebase deploy --only functions:reconocerMaquina` cuando corresponda.
- Para reconocimiento con cajas, configurar `EXPO_PUBLIC_RECONOCIMIENTO_NUBE=true`
  y el endpoint/secret de Ultralytics del servidor. La clave privada no va al APK.
- Usar un Android compatible con ARCore, con permiso de cámara y Servicios de
  Google Play para RA instalados/actualizados. La vista solicita su instalación
  si hace falta. Si falla o no es compatible, ofrece cámara convencional.
- El APK de desarrollo necesita Metro: después de instalarlo, iniciar
  `npx expo start --dev-client` y conectar el cliente al servidor de desarrollo.

No se persisten fotos ni poses en Firestore. El JPEG temporal del caché se elimina
al reemplazarlo o cerrar/pausar la vista. Al salir o poner la app en segundo plano
se pausa la sesión, se liberan anclas y se descartan resultados de solicitudes
anteriores. Al regresar, la información se coloca de nuevo.

## Verificación

Comprobado el 3 de noviembre de 2026:

- TypeScript, ESLint y formato correctos.
- 160 pruebas de app, 22 de backend y 5 JVM de geometría aprobadas.
- Exportaciones web y Android/Hermes correctas.
- APK de desarrollo ARM64 compilado con JDK 22 y firma v2 verificada con
  `apksigner`. Contiene `CoachARModule` y las bibliotecas JNI de ARCore.
  Salida: `android/app/build/outputs/apk/debug/app-debug.apk` (108,2 MB).
- Sin teléfono conectado en ADB: seguimiento real y llamada al endpoint desde
  el dispositivo pendientes. Los cambios de la Cloud Function no se desplegaron.

Los tests de backend cubren normalización, cajas inválidas y asociación con la
instancia ganadora. Los tests del controlador comprueban que las cajas de las
alternativas no se mezclan con la máquina principal. Los tests JVM de
`GeometriaARTest` cubren orientación 0/90/180/270, ejes ópticos e intrínsecos.

Desde `android/`, ejecutar:

```powershell
./gradlew.bat :coach-ar:compileDebugKotlin :coach-ar:testDebugUnitTest :app:assembleDebug
```

La instalación de Android Studio de este equipo incluye JBR/Java 25; la tarea
CMake de Nitro falló al ejecutar una herramienta con ese runtime. La compilación
completa pasó con el JDK 22 instalado, seleccionándolo solo para el proceso:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-22'
$env:ANDROID_HOME='C:/Android/Sdk'
$env:NODE_ENV='development'
```

En este equipo Java presentó `Unable to establish loopback connection` al usar
sockets Unix de Windows. Para esa verificación se usó una variable de entorno
temporal del proceso, sin cambiar la configuración del proyecto ni del sistema:

```powershell
$env:JAVA_TOOL_OPTIONS='"-Djdk.net.unixdomain.tmpdir=D:/UMSS/APLICACION MOVIL PROYECTO DE GRADA/coach-app/_tmp/java-unix-no-disponible"'
```

Ese directorio debe permanecer inexistente: Java utiliza entonces su alternativa
TCP para las conexiones locales de Gradle. El ajuste no corresponde al código
de la aplicación ni debe configurarse en EAS.

Prueba obligatoria en dispositivo antes de considerar validado el seguimiento:

1. Mover lentamente el teléfono hasta recuperar seguimiento; capturar una máquina.
2. Mover el teléfono mientras responde el endpoint; comprobar que el ancla usa la
   dirección original de captura y muestra únicamente la ficha correspondiente.
3. Confirmar una candidata secundaria y comprobar su propia caja y su ficha.
4. Si no hay superficie, tocar una junto a la máquina y comprobar el marcador.
5. Caminar lateralmente y girar el teléfono: la etiqueta debe permanecer junto al
   punto colocado, ocultándose al quedar fuera de cámara.
6. Usar “Recolocar información”, “Escanear otra”, volver atrás y segundo plano.
   No deben reaparecer fichas ni respuestas de capturas anteriores.
7. Probar poca luz, cámara denegada, servicio sin conexión y teléfono sin ARCore;
   debe mantenerse una salida clara hacia la cámara convencional o el catálogo.

## Referencias

- https://developers.google.com/ar/develop/java/machine-learning
- https://developers.google.com/ar/reference/java/com/google/ar/core/Frame
- https://developers.google.com/ar/develop/anchors
- https://developers.google.com/ar/develop/java/enable-arcore
- https://docs.expo.dev/modules/autolinking/
- https://docs.ultralytics.com/platform/deploy/endpoints
