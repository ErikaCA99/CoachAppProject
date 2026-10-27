// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
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
      "android/**",
      "ios/**",
      ".agents/**",
      ".kiro/**",
      ".codex/**",
    ],
  },
]);
