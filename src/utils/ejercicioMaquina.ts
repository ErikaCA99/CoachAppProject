import type {
  EjercicioGif,
  EjercicioMaquina,
  Maquina,
} from "@/models/entities/Maquina";
import { normalizarTexto } from "@/utils/texto";

/**
 * Reglas de negocio de la ficha de una máquina: relacionar un ejercicio con
 * GIF del catálogo con su ejercicio "real" y generar un detalle de respaldo
 * cuando no hay datos externos. Funciones puras (sin Firebase ni React).
 */

export function buscarEjercicioRelacionado(
  maquina: Maquina,
  ejercicioGif: EjercicioGif,
): EjercicioMaquina | null {
  const candidatos = [
    ejercicioGif.nombre,
    ejercicioGif.nombreOriginal,
    ejercicioGif.musculoObjetivo,
  ].map(normalizarTexto);

  for (const ejercicio of maquina.ejercicios) {
    const nombreEjercicio = normalizarTexto(ejercicio.nombre);
    if (
      candidatos.some(
        (candidato) =>
          candidato === nombreEjercicio ||
          candidato.includes(nombreEjercicio) ||
          nombreEjercicio.includes(candidato),
      )
    ) {
      return ejercicio;
    }
  }

  return null;
}

export interface DetalleEjercicioGenerado {
  categoria: string;
  descripcion: string;
  gruposMusculares: string[];
  instrucciones: string[];
}

export function generarDetalleEjercicio(
  maquina: Maquina,
  ejercicioGif: EjercicioGif,
): DetalleEjercicioGenerado {
  const secundarios = maquina.musculosSecundarios.slice(0, 2);
  const musculos = [ejercicioGif.musculoObjetivo, ...secundarios].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );
  const categoria = maquina.categoria || "Fortalecimiento";
  const objetivoPorDificultad: Record<EjercicioGif["dificultad"], string> = {
    Principiante:
      "aprender la técnica base con control del movimiento y postura segura",
    Intermedio:
      "desarrollar fuerza e hipertrofia manteniendo una ejecución estable",
    Avanzado:
      "aumentar intensidad y control bajo mayor carga sin perder técnica",
  };

  const descripcion =
    `${ejercicioGif.nombre} en ${maquina.nombre} está orientado a trabajar principalmente ${ejercicioGif.musculoObjetivo.toLowerCase()}. ` +
    `Se recomienda para ${objetivoPorDificultad[ejercicioGif.dificultad]}.`;

  const instrucciones = [
    "Ajusta asiento, respaldo o polea para que la articulación principal quede alineada con el eje de la máquina.",
    `Inicia el movimiento de forma controlada, concentrando el esfuerzo en ${ejercicioGif.musculoObjetivo.toLowerCase()} y evitando impulsos.`,
    "Regresa lentamente a la posición inicial, manteniendo tensión muscular y respiración constante.",
    ...maquina.prevencionLesiones.slice(0, 2),
  ];

  return {
    categoria,
    descripcion,
    gruposMusculares: musculos.length ? musculos : maquina.musculosPrincipales,
    instrucciones,
  };
}
