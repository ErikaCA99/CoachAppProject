# Arquitectura de `src/` — coach-app

La app sigue **MVC organizado por funcionalidad** sobre una arquitectura
**cliente-servidor**. Cada funcionalidad (`features/<x>/`) contiene su propio
Modelo, Controlador y Vista; la infraestructura compartida vive en `core/` y la
UI reutilizable en `shared/`. Las dependencias solo bajan:

```
app/ (rutas) → features/x/view → features/x/controller → features/x/model | features/x/api → core/ → servidor
```

Estas fronteras no dependen de la disciplina de cada desarrollador: las hace
cumplir ESLint (`import/no-restricted-paths` y `no-restricted-imports` en
`eslint.config.js`). Un import que las rompa hace fallar `npx eslint .`.

## Árbol

```
src/
├── app/                    VISTA (entrada): rutas de Expo Router. Componen pantallas
│                           con componentes de view/ y llaman a controladores.
├── features/               Un módulo por funcionalidad
│   ├── auth/               inicio de sesión, registro, Google, sesión
│   ├── profile/            perfil de usuario y onboarding
│   ├── machines/           catálogo, guía de uso, escáner y AR
│   ├── exercises/          ejercicios wger + ExerciseDB + demostraciones locales
│   ├── routines/           generación con IA, editor y planificación
│   ├── workout/            entrenamiento guiado y registro de sesiones
│   ├── nutrition/          IMC, ingesta calórica y búsqueda USDA
│   └── progress/           progreso físico y reportes PDF
│       ├── model/
│       │   ├── entities/      tipos de dominio
│       │   ├── rules/         reglas de negocio puras y testeables
│       │   ├── schemas/       validación Zod (entrada y documentos persistidos)
│       │   ├── repositories/  acceso a datos: Firestore / almacenamiento local ↔ entidad
│       │   └── ai/            (solo routines) inferencia on-device del recomendador
│       ├── api/            CLIENTE-SERVIDOR: llamadas remotas, DTO validados y mapeo
│       ├── controller/     casos de uso (XController.ts) y hooks de pantalla (useX.ts)
│       ├── view/           componentes de la funcionalidad (props + eventos)
│       ├── __tests__/
│       └── index.ts        API pública de dominio: entidades, reglas y esquemas
├── core/                   INFRAESTRUCTURA compartida (sin UI ni dominio)
│   ├── firebase/           app, Auth (authService), Firestore, Storage, App Check
│   ├── http/               callable.ts (Cloud Functions) y httpClient.ts (APIs REST)
│   ├── errors/             mapError (códigos → mensajes), ResultadoAccion, toast
│   ├── storage/            localStore (único acceso a AsyncStorage)
│   ├── validation/         piezas comunes de los esquemas persistidos
│   └── types.ts            ConId<T>
├── shared/                 UI reutilizable que no conoce el dominio
│   ├── ui/                 sistema de componentes (botones, campos, hojas…)
│   ├── theme/              palette.ts, typography.ts
│   ├── hooks/              usePressAnimation, useReducedMotion, useLoadError
│   └── lib/                utilidades genéricas (text.ts)
├── store/                  estado GLOBAL (Zustand): auth.store y toast.store
├── config/                 env.ts (variables de entorno validadas), googleSignIn.ts
└── types/                  solo declaraciones ambientales (.d.ts)
```

Los recursos binarios viven fuera de `src/`, en `assets/` (imágenes, modelos
`.tflite` y `assets/exercises/` con las demostraciones GIF), y se importan con
el alias `@/assets/…`.

## Correspondencia con el patrón MVC

| Capa (proyecto de grado)       | Rol en MVC     | Carpeta(s)                                                        |
| ------------------------------ | -------------- | ----------------------------------------------------------------- |
| Presentación                   | **Vista**      | `app/` (rutas) y `features/*/view/`; UI genérica en `shared/ui/`  |
| Lógica de negocio              | **Controlador**| `features/*/controller/` (casos de uso, hooks de pantalla, stores de la funcionalidad) |
| Modelo de datos y persistencia | **Modelo**     | `features/*/model/` (entidades, reglas, esquemas, repositorios)   |
| Comunicación con el servidor   | Cliente-servidor | `features/*/api/` (por funcionalidad) y `core/http/`, `core/firebase/` |

## Reglas de dependencia (las verifica ESLint)

- **Vista** (`app/`, `features/*/view/`): usa controladores y el dominio
  (`@/features/x`). Nunca importa `core/firebase`, `core/http`, `core/storage`,
  repositorios ni `api/`.
- **Controlador**: no importa componentes de `view/`.
- **Modelo** y **api/**: no importan controladores ni vistas.
- **Entre funcionalidades**: solo `@/features/x` (dominio), `controller/`,
  `view/` y `model/repositories/` de la otra funcionalidad. Nunca su `api/` ni
  archivos internos de `model/` (entities, rules, schemas, ai) por ruta profunda.
- **`core/`** y **`shared/`** no conocen las funcionalidades ni las rutas;
  `shared/` tampoco usa infraestructura.
- **SDKs**: Firebase solo en `core/firebase/` y `core/http/callable.ts`; axios
  solo en `core/http/httpClient.ts`; AsyncStorage solo en `core/storage/` (y la
  persistencia de Auth en `core/firebase/firebase.ts`).

`features/x/index.ts` exporta únicamente módulos puros (sin Firebase, red ni
estado), así que importarlo no arrastra infraestructura.
Los casos de uso se importan desde `controller/` con su ruta.
