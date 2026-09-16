# Correspondencia de capas MVC — coach-app

Este archivo existe para que cualquiera que lea el código directamente en GitHub
(sin pasar por la guía de implementación) vea de inmediato cómo se mapean las
carpetas de este proyecto al patrón Modelo-Vista-Controlador definido en el
Capítulo 3 del proyecto de grado.

| Capa (proyecto de grado) | Rol en MVC | Carpeta(s) en este repositorio |
|---|---|---|
| Presentación | **Vista** | `app/` (pantallas — rutas de Expo Router) y `components/` (componentes de UI reutilizables que las pantallas de `app/` consumen) |
| Lógica de Negocio | **Controlador** | `controllers/` (casos de uso) y `utils/` (reglas puras, p. ej. `imcCalculator.ts`) |
| Modelo de datos y persistencia | **Modelo** | `models/entities/` (tipos), `models/repositories/` (acceso a datos) |
| Integraciones externas (Firebase, TensorFlow Lite) | Servicios (transversal) | `services/firebase/` |
| Configuración visual (colores, tipografía) | Fuera del patrón MVC — tokens de diseño consumidos por la Vista | `constants/` |

**Por qué `app/` + `components/` y no una única carpeta `views/`.** Expo Router
—el enrutador oficial de Expo usado en este proyecto— exige que las pantallas
(rutas) vivan en una carpeta `app/`; ese nombre no es negociable porque el
enrutador construye el árbol de navegación a partir de esa carpeta específica.
`components/` es la convención estándar de React Native para los widgets de UI
que no son pantallas completas. Juntas, ambas carpetas cumplen exactamente el
rol de "Vista" del patrón MVC: no deberían contener lógica de negocio ni
llamadas directas a Firebase — eso pasa por un controlador (`controllers/`).

## Estado actual de la arquitectura por capas (para que quede constancia)

Hoy solo el módulo de **Nutrición** sigue completo el patrón de las cuatro
capas (`NutritionController.ts`, `RegistroNutricional.ts`,
`nutricionRepository.ts`, vista en `app/(app)/nutricion.tsx`). El resto de
pantallas (`HomeScreen.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`,
`MachinesScreen.tsx`, `TargetSelectionScreen.tsx`, `ProfileScreen.tsx`, rutas
de `routines/` y `progress/`) todavía llaman a Firebase directamente o son
pantallas de relleno, sin su propio controlador ni repositorio — no hay
`AuthController`, `MachineController`, `RoutineController` ni
`ProgressController` todavía. Extender el patrón de Nutrición al resto de
módulos queda como trabajo pendiente de la Fase de Producción.
