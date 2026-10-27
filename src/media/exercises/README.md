# Demostraciones locales de ejercicios

Se incorporaron 12 GIFs proporcionados por el usuario desde la carpeta
`Imagenes/gifts` del proyecto de grado. El usuario confirmó el permiso de uso
en la conversación del 23 de octubre de 2026. Esta nota registra esa confirmación;
no atribuye a estos archivos una licencia pública ni inventa su autoría.

Los originales se copiaron sin modificar. `posters/` contiene el primer fotograma
en PNG, con lado máximo de 700 píxeles, para mostrar una vista realmente estática
en Android y web antes de reproducir, al detener y con movimiento reducido.

El mapeo manual por ID vive en
`src/models/repositories/localDemonstrationRepository.ts`:

- `remo-sentado`: remo sentado en polea.
- `jalon-pecho`: jalón supino y jalón cerrado.
- `press-hombro`: press en máquina de palancas.
- `banco-predicador`: curl con barra EZ.
- `pantorrillas`: elevación de talones de pie en máquina.
- `smith`: elevación de talones con barra guiada.
- `prensa-piernas`: elevación de talones en prensa, diferenciada del ejercicio habitual de piernas.
- `estacion-poleas`: face pull, abdominal de rodillas, curl en dos poleas altas y remo vertical.

El visor se encuentra en la pestaña **Uso** de esas máquinas. Solo monta una
demostración a la vez y vuelve a una imagen estática al salir de la ficha,
cambiar de ejercicio o pasar la aplicación a segundo plano. La foto principal,
el catálogo de Firestore y los GIFs remotos existentes se conservan.

Los GIFs originales suman aproximadamente 16,9 MB decimales; los PNG añaden
su propio tamaño al paquete. Estos recursos se incluyen en la aplicación y
no requieren peticiones a Firebase Storage para reproducirse. La carga del
catálogo sigue usando Firestore: esto no convierte toda la ficha en offline.

Se excluyeron archivos sin correspondencia clara o que requieren equipamiento
distinto, como elevaciones sentadas, rotaciones sentadas en polea, ejercicios
con mancuernas, peso muerto y movimientos olímpicos. No se usa similitud de
nombres para asignarlos automáticamente.
