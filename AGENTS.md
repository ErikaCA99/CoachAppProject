# AGENTS.md - Guía del Proyecto para Asistentes de IA

## Resumen del Proyecto

- **Descripción:** `coach-app` es una aplicación móvil Android (proyecto de grado, UMSS — Ingeniería de Sistemas) de entrenamiento inteligente en gimnasios. Cubre: guía de uso correcto de máquinas y ejercicios (con instrucciones, imágenes progresivas y riesgos por mala postura), generación de rutinas personalizadas (hoy con heurística; IA real vía TensorFlow Lite pendiente), registro calórico e IMC, y seguimiento/reportes de progreso físico.
- **Metodología:** Mobile-D (Exploración → Inicialización → Producción → Estabilización). Este repo está formalmente en la Fase de Inicialización/Producción.
- **Stack principal:** Expo SDK 57 · React Native 0.86 · React 19 · TypeScript estricto · Expo Router (enrutamiento basado en archivos) · Firebase (Authentication, Firestore, Storage) · Zod + react-hook-form · NativeWind (Tailwind para RN) · react-native-chart-kit · TensorFlow Lite (placeholder, no integrado todavía).
- **Gestor de paquetes:** `npm` (no `pnpm`). Ver nota en "Comandos esenciales".

⚠️ **Antes de asumir nada sobre el estado del código, verifícalo.** La documentación de este proyecto se ha escrito en varias sesiones y hubo desfases reales entre lo documentado y lo implementado (por ejemplo: en un momento solo el módulo de Nutrición seguía la arquitectura por capas mientras Auth/Máquinas/Rutinas seguían llamando a Firebase directo desde la Vista; nombres de archivo no seguían la convención de Expo Router). No des por hecho que una guía ya fue aplicada al 100 % — revisa `src/` antes de escribir código nuevo o de afirmar que algo "ya existe".

## Arquitectura (cliente-servidor, capas MVC)

| Capa | Rol MVC | Carpeta |
|---|---|---|
| Presentación | Vista | `src/app/` (rutas Expo Router) y `src/components/` |
| Lógica de Negocio | Controlador | `src/controllers/` y `src/utils/` |
| Modelo de datos | Modelo | `src/models/entities/`, `src/models/schemas/`, `src/models/repositories/` |
| Integraciones externas | Servicios | `src/services/firebase/` y `src/services/ai/` |

Reglas de la arquitectura que hay que respetar al modificar código:

- Los archivos de `src/app/` son **solo Vista**: nunca importan Firebase ni hacen lógica de negocio directamente; siempre pasan por un controlador de `src/controllers/`.
- Los **repositorios** (`src/models/repositories/`) son el único lugar que conoce la forma real de Firestore (nombres de colección, rutas de subcolección). Controladores y pantallas no arman rutas de Firestore a mano.
- `src/services/firebase/firestoreService.ts` expone helpers genéricos (`listar`, `obtenerPorId`, `crear`, `actualizar`, `eliminar`, `observar`); no lo dupliques ni accedas al SDK de Firestore fuera de `services/firebase`.
- Alias de importación: usa `@/*` (→ `./src/*`), nunca rutas relativas largas tipo `../../../`.
- Enrutamiento (Expo Router): el nombre de archivo **es** la ruta. `(auth)/` y `(app)/` son grupos que no aparecen en la URL. Cada pantalla exporta con `export default` (requisito del router, no opcional). La protección de sesión vive en `src/app/_layout.tsx` con `Stack.Protected` — no reimplementes guards manuales pantalla por pantalla.
- Suscripciones a datos de Firestore usan `onSnapshot` (método `observar`/`observarPorUsuario`) para tiempo real, no `getDocs` + una función `recargar()` manual — ese patrón viejo fue reemplazado a propósito porque violaba la regla de ESLint `react-hooks/set-state-in-effect`.

## Modelo de datos (Firestore)

```
maquinas/{maquinaId}                          → catálogo público, solo lectura
ejercicios/{ejercicioId}                      → catálogo público, solo lectura
usuarios/{usuarioId}                          → doc = perfil, id = uid de Firebase Auth
  ├── rutinas/{rutinaId}                      → subcolección privada
  ├── registrosNutricionales/{registroId}     → subcolección privada
  └── progresoFisico/{registroId}             → subcolección privada
```

- `maquinas` y `ejercicios` son catálogos de solo lectura para la app; se escriben únicamente desde scripts de seed con el SDK Admin (fuera de la app, con `serviceAccountKey.json`), nunca desde un cliente autenticado.
- Los datos propios de cada usuario viven en subcolecciones bajo `usuarios/{usuarioId}` (no en colecciones raíz filtradas por un campo `usuarioId`), aunque el campo `usuarioId` se mantiene también dentro de cada documento como defensa en profundidad para las reglas de seguridad.
- Las fechas son `Timestamp` de Firestore generados con `serverTimestamp()` desde el repositorio — nunca construyas una fecha en el cliente (`new Date()`) para persistirla.
- Las reglas de seguridad de Firestore son la barrera real (las credenciales de Firebase viajan dentro del APK y son públicas por diseño). No asumas que la validación de Zod del cliente es suficiente: las reglas también validan tipos y rangos.

## Comandos Esenciales

Este proyecto usa `npm`/`npx`, no `pnpm` ni `yarn` (el equipo probó `npx expo install` y falla con `HTTP Proxy Network Error: Forbidden` en algunos entornos; usar `npm install` con versiones fijadas).

- **Instalar:** `npm install`
- **Desarrollo:** `npx expo start` (o `npm run start`) — abre con Expo Go; reinicia el servidor tras editar `.env`
- **Android / iOS:** `npm run android` / `npm run ios`
- **Verificación de tipos:** `npx tsc --noEmit`
- **Lint:** `npx eslint .` (o `npm run lint`) — debe salir en cero errores y cero advertencias, **sin reglas desactivadas** en `eslint.config.js`
- **Formato:** `npx prettier --check "src/**/*.{ts,tsx}"` (autofix: `npx prettier --write "src/**/*.{ts,tsx}"`)
- **Verificación de empaquetado:** `npx expo export -p web` — detecta rutas duplicadas, imports rotos y dependencias faltantes que `tsc` no ve
- **Pruebas:** no hay infraestructura de tests instalada todavía (`jest-expo` y `@testing-library/react-native` están pendientes, corresponde a la Fase de Estabilización de Mobile-D). Mientras tanto, el criterio de "verificado" de este proyecto es correr, en orden, `tsc --noEmit` → `eslint .` → `prettier --check` → `expo export -p web`, los cuatro sin errores.

## Convenciones de Código

- TypeScript estricto en todo `src/`; sigue el estilo ya presente en el archivo que edites antes que imponer uno nuevo.
- Nombres de entidades y campos de dominio en **español** (`Usuario`, `Maquina`, `Ejercicio`, `Rutina`, `RegistroNutricional`, `ProgresoFisico`, `usuarioId`, `grupoMuscular`...) — mantén esa convención en código nuevo del dominio; los nombres técnicos de hooks/props de librerías (`useState`, `onPress`) se quedan en inglés como ya está.
- No modifiques `package.json`, `app.json` ni `tsconfig.json` sin permiso explícito: contienen configuración sensible al funcionamiento del proyecto (`"main": "expo-router/entry"`, `experiments.typedRoutes`, el alias `paths: { "@/*": ["./src/*"] }`). Un cambio accidental ahí rompe el enrutador o el build sin un error obvio.
- No reintroduzcas React Navigation ni Redux: la decisión de arquitectura vigente es Expo Router (enrutamiento) + React Context (`src/context/AuthContext`, `UserContext`) para estado global — no hay Redux/Redux Toolkit en este stack.
- Para el catálogo de máquinas/ejercicios: las fuentes de datos externas ya están decididas (wger API y/o `free-exercise-db`, ambas de acceso libre); no propongas scraping de HTML como primera opción — varias de esas páginas están detrás de protección anti-bot y ya existe una vía oficial documentada.
- El mapeo manual máquina → ejercicio externo (`fuentes-mapeo.json`) se hizo a mano a propósito porque el matching difuso por nombre daba resultados incorrectos; no lo reemplaces por lógica de similitud automática sin que te lo pidan explícitamente.
- Nunca hardcodees credenciales de Firebase ni las imprimas en un mensaje o commit; viven en `.env` (prefijo `EXPO_PUBLIC_`, no versionado) y se leen vía `src/config/env.ts`.

## Reglas de Pruebas

- Hoy no existe una suite de pruebas unitarias — no asumas que hay que "agregar el test correspondiente" con Jest a menos que primero se instale la infraestructura (`jest-expo`, `@testing-library/react-native`, y para navegación `expo-router/testing-library`).
- Hasta que esa infraestructura exista, toda función o pantalla nueva se considera verificada cuando pasan, sin errores ni advertencias, en este orden: `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check "src/**/*.{ts,tsx}"`, `npx expo export -p web`.
- Si te piden explícitamente instalar y configurar pruebas unitarias, es trabajo de la Fase de Estabilización de Mobile-D: confírmalo antes de asumir alcance adicional no pedido.