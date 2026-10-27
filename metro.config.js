const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { FileStore } = require("metro-cache");

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

// Caché del proyecto: los directorios temporales cambian entre ejecuciones aisladas.
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, ".expo/cache/metro-transform") }),
];
config.fileMapCacheDirectory = path.join(
  __dirname,
  ".expo/cache/metro-file-map",
);
fs.mkdirSync(config.fileMapCacheDirectory, { recursive: true });

// Modelos de TensorFlow Lite (assets/models/*.tflite) empaquetados como assets.
config.resolver.assetExts.push("tflite");

// Excluir carpetas nativas y artefactos de compilación DEL PROYECTO (no de node_modules)
// del watcher de Metro para evitar timeouts en Windows.
// OJO: los patrones deben estar anclados a la raíz del proyecto. Un patrón genérico como
// /.*[/\\]dist[/\\].*/ bloquea también node_modules/**/dist/** (react-native-css-interop,
// react-native-chart-kit, @radix-ui/*, ...) y rompe la resolución de módulos.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rootDir = (name) =>
  new RegExp("^" + escapeRe(path.join(__dirname, name)) + "[/\\\\].*");

const exclusionList = [
  rootDir("android"),
  rootDir("ios"),
  rootDir("dist"),
  // Herramientas del asistente: no son fuentes ni recursos de la aplicación.
  rootDir(".agents"),
  rootDir(".kiro"),
  rootDir(".codex"),
];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(...exclusionList);
} else if (config.resolver.blockList) {
  config.resolver.blockList = [config.resolver.blockList, ...exclusionList];
} else {
  config.resolver.blockList = exclusionList;
}

module.exports = withNativeWind(config, {
  input: "./src/global.css",
  inlineRem: 16,
});
