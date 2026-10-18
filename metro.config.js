const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

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

const exclusionList = [rootDir("android"), rootDir("ios"), rootDir("dist")];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(...exclusionList);
} else if (config.resolver.blockList) {
  config.resolver.blockList = [config.resolver.blockList, ...exclusionList];
} else {
  config.resolver.blockList = exclusionList;
}

module.exports = withNativeWind(config, { input: "./src/global.css" });
