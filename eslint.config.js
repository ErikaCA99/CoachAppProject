// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

// ---------------------------------------------------------------------------
// Fronteras de la arquitectura (MVC por funcionalidad + cliente-servidor).
// Las dependencias solo bajan: app/ → features/*/view → controller → model/api
// → core/ → servidor. Ver src/README.md.
// ---------------------------------------------------------------------------
const FEATURES = [
  "auth",
  "exercises",
  "machines",
  "nutrition",
  "profile",
  "progress",
  "routines",
  "workout",
];
const INFRA = [
  "./src/core/firebase",
  "./src/core/http",
  "./src/core/storage",
  "./src/core/validation",
];
// Una ruta con comodín se interpreta como glob: debe cubrir todo su contenido.
const ruta = (p) => (p.includes("*") ? `${p}/**` : p);
const zona = (target, from, message, except) => ({
  target: ruta(target),
  from: ruta(from),
  message,
  ...(except ? { except } : {}),
});
// Lo que una funcionalidad expone a las demás: su dominio (index.ts), sus
// casos de uso (controller/), sus componentes (view/) y sus repositorios.
const entreFuncionalidades = FEATURES.flatMap((a) =>
  FEATURES.filter((b) => b !== a).map((b) =>
    zona(
      `./src/features/${a}`,
      `./src/features/${b}`,
      `Desde otra funcionalidad importa "@/features/${b}" (dominio), su controller/, view/ o model/repositories/; nunca su api/ ni archivos internos de model/.`,
      ["./index.ts", "./controller", "./view", "./model/repositories"],
    ),
  ),
);
// Las rutas y el estado global solo ven el dominio, los controladores y las vistas.
const desdeCapasExternas = ["./src/app", "./src/store"].flatMap((target) =>
  FEATURES.map((b) =>
    zona(
      target,
      `./src/features/${b}`,
      `Las rutas y los stores usan "@/features/${b}" (dominio), su controller/ o su view/.`,
      ["./index.ts", "./controller", "./view"],
    ),
  ),
);
const fronteras = [
  ...entreFuncionalidades,
  ...desdeCapasExternas,
  // Vista: nunca toca infraestructura, repositorios ni la red.
  ...INFRA.flatMap((from) => [
    zona("./src/app", from, "La Vista usa un controlador, no la infraestructura."),
    zona("./src/features/*/view", from, "La Vista usa un controlador, no la infraestructura."),
    zona("./src/shared", from, "shared/ es UI reutilizable: sin infraestructura."),
  ]),
  zona("./src/features/*/view", "./src/features/*/model/repositories", "La Vista no lee repositorios: usa el controlador."),
  zona("./src/features/*/view", "./src/features/*/api", "La Vista no llama a la red: usa el controlador."),
  // Modelo y red: no dependen de la UI ni de los casos de uso.
  zona("./src/features/*/model", "./src/features/*/controller", "El Modelo no depende del Controlador."),
  zona("./src/features/*/model", "./src/features/*/view", "El Modelo no depende de la Vista."),
  zona("./src/features/*/api", "./src/features/*/controller", "La capa de red no depende del Controlador."),
  zona("./src/features/*/api", "./src/features/*/view", "La capa de red no depende de la Vista."),
  zona("./src/features/*/controller", "./src/features/*/view", "El Controlador no importa componentes."),
  // Capas compartidas: no conocen las funcionalidades ni las rutas.
  zona("./src/core", "./src/features", "core/ no conoce las funcionalidades."),
  zona("./src/core", "./src/app", "core/ no conoce las rutas."),
  zona("./src/shared", "./src/features", "shared/ no conoce el dominio."),
  zona("./src/shared", "./src/app", "shared/ no conoce las rutas."),
  zona("./src/config", "./src/features", "config/ no depende de nada de la app."),
  zona("./src/config", "./src/core", "config/ no depende de nada de la app."),
  zona("./src/features", "./src/app", "Las funcionalidades no importan rutas."),
];
// SDKs de red y almacenamiento: solo dentro de core/.
const sdkRestringidos = (permitidos) => ({
  patterns: [
    {
      clave: "firebase",
      regex: "^(@firebase/|firebase(/|$)|@react-native-firebase/)",
      message: "El SDK de Firebase solo se usa en src/core/firebase y src/core/http.",
    },
    {
      clave: "axios",
      regex: "^axios(/|$)",
      message: "Usa crearClienteHttp de src/core/http/httpClient.",
    },
    {
      clave: "async-storage",
      regex: "^@react-native-async-storage/async-storage$",
      message: "Usa localStore de src/core/storage/localStore.",
    },
  ]
    .filter((p) => !permitidos.includes(p.clave))
    .map(({ regex, message }) => ({ regex, message })),
});

module.exports = defineConfig([
  expoConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/__tests__/**"],
    rules: {
      "import/no-restricted-paths": ["error", { zones: fronteras }],
      "no-restricted-imports": ["error", sdkRestringidos([])],
    },
  },
  {
    files: ["src/core/firebase/**", "src/core/http/callable.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        sdkRestringidos(["firebase", "async-storage"]),
      ],
    },
  },
  {
    files: ["src/core/http/httpClient.ts"],
    rules: { "no-restricted-imports": ["error", sdkRestringidos(["axios"])] },
  },
  {
    files: ["src/core/storage/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        sdkRestringidos(["async-storage"]),
      ],
    },
  },
  {
    files: ["src/types/**/*.d.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
          extensions: [
            ".ts",
            ".tsx",
            ".d.ts",
            ".js",
            ".jsx",
            ".json",
            ".gif",
            ".png",
          ],
        },
      },
    },
  },
  {
    ignores: [
      "dist/*",
      "**/.venv/**",
      "_tmp/**",
      ".expo/**",
      ".gradle/**",
      "android/**",
      "ios/**",
      "modules/**/android/build/**",
      "modules/**/android/.gradle/**",
      ".agents/**",
      ".kiro/**",
      ".codex/**",
    ],
  },
]);
