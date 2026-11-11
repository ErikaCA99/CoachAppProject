// Punto de entrada de Cloud Functions: solo re-exporta las funciones.
// Cada funcionalidad vive en features/<x>/ (función + esquemas) y el código
// común (Auth, errores, cuotas, red, Firebase Admin) en shared/.
export { buscarAlimentos } from "./features/nutrition/buscarAlimentos.mjs";
export { guardarRutina } from "./features/routines/guardarRutina.mjs";
export { reconocerMaquina } from "./features/machines/reconocerMaquina.mjs";
