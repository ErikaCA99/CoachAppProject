// Permite `import "../global.css"` (efecto secundario de NativeWind) sin depender
// de `expo-env.d.ts`, que está en .gitignore y solo lo genera `expo start`
// (por eso en el CI de GitHub faltaba y tsc fallaba con TS2882).
declare module "*.css";
