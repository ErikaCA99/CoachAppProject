import remoSentado from "@/assets/exercises/cable-seated-row.gif";
import jalonSupino from "@/assets/exercises/supinated-lat-pulldown.gif";
import jalonCerrado from "@/assets/exercises/close-grip-lat-pulldown-standard-bar-attachment.gif";
import pressHombro from "@/assets/exercises/presse-epaule-exercice-musculation.gif";
import curlPredicador from "@/assets/exercises/ez-bar-preacher-curl1.gif";
import pantorrillas from "@/assets/exercises/extension-mollets-debout-machine.gif";
import pantorrillasSmith from "@/assets/exercises/smith-machine-calf-raise.gif";
import pantorrillasPrensa from "@/assets/exercises/leg-press-calf-raise.gif";
import facePull from "@/assets/exercises/cable-face-pull.gif";
import abdominalPolea from "@/assets/exercises/cable-knee-crunch.gif";
import curlPoleas from "@/assets/exercises/overhead-cable-curl.gif";
import remoVertical from "@/assets/exercises/upright-cable-row.gif";
import type { DemostracionLocal } from "@/features/exercises/model/entities/LocalDemonstration";
import remoSentadoEstatico from "@/assets/exercises/posters/cable-seated-row.png";
import jalonSupinoEstatico from "@/assets/exercises/posters/supinated-lat-pulldown.png";
import jalonCerradoEstatico from "@/assets/exercises/posters/close-grip-lat-pulldown-standard-bar-attachment.png";
import pressHombroEstatico from "@/assets/exercises/posters/presse-epaule-exercice-musculation.png";
import curlPredicadorEstatico from "@/assets/exercises/posters/ez-bar-preacher-curl1.png";
import pantorrillasEstatico from "@/assets/exercises/posters/extension-mollets-debout-machine.png";
import pantorrillasSmithEstatico from "@/assets/exercises/posters/smith-machine-calf-raise.png";
import pantorrillasPrensaEstatico from "@/assets/exercises/posters/leg-press-calf-raise.png";
import facePullEstatico from "@/assets/exercises/posters/cable-face-pull.png";
import abdominalPoleaEstatico from "@/assets/exercises/posters/cable-knee-crunch.png";
import curlPoleasEstatico from "@/assets/exercises/posters/overhead-cable-curl.png";
import remoVerticalEstatico from "@/assets/exercises/posters/upright-cable-row.png";

/** Mapeo manual por ID: no sustituye fuentes-mapeo ni modifica Firestore. */
const DEMOSTRACIONES: Readonly<Record<string, readonly DemostracionLocal[]>> = {
  "remo-sentado": [
    {
      id: "remo-polea",
      nombre: "Remo sentado en polea",
      recurso: remoSentado,
      vistaEstatica: remoSentadoEstatico,
      indicacion:
        "Variante con polea baja y agarre cerrado. Mantén el tronco estable y evita balancearte.",
    },
  ],
  "jalon-pecho": [
    {
      id: "jalon-supino",
      nombre: "Jalón al pecho con agarre supino",
      recurso: jalonSupino,
      vistaEstatica: jalonSupinoEstatico,
      indicacion:
        "Usa la polea alta con las palmas hacia ti; lleva la barra por delante de la cabeza.",
    },
    {
      id: "jalon-cerrado",
      nombre: "Jalón al pecho con agarre cerrado",
      recurso: jalonCerrado,
      vistaEstatica: jalonCerradoEstatico,
      indicacion:
        "Variante con las manos próximas en una barra recta. Ajusta los apoyos de los muslos antes de comenzar.",
    },
  ],
  "press-hombro": [
    {
      id: "press-hombro-maquina",
      nombre: "Press de hombros en máquina",
      recurso: pressHombro,
      vistaEstatica: pressHombroEstatico,
      indicacion:
        "La ilustración muestra una máquina de palancas con discos. Ajusta el asiento y usa el agarre disponible en tu equipo.",
    },
  ],
  "banco-predicador": [
    {
      id: "curl-predicador-ez",
      nombre: "Curl predicador con barra EZ",
      recurso: curlPredicador,
      vistaEstatica: curlPredicadorEstatico,
      indicacion:
        "Requiere banco predicador y barra EZ. Apoya los brazos y evita extender bruscamente los codos.",
    },
  ],
  pantorrillas: [
    {
      id: "pantorrillas-de-pie",
      nombre: "Elevación de talones de pie en máquina",
      recurso: pantorrillas,
      vistaEstatica: pantorrillasEstatico,
      indicacion:
        "Esta variante requiere una máquina con apoyos sobre los hombros; no representa la variante sentada.",
    },
  ],
  smith: [
    {
      id: "pantorrillas-smith",
      nombre: "Elevación de talones en Smith",
      recurso: pantorrillasSmith,
      vistaEstatica: pantorrillasSmithEstatico,
      indicacion:
        "Ejercicio de pantorrillas con barra guiada. Usa una plataforma estable y ajusta los seguros de la Smith.",
    },
  ],
  "prensa-piernas": [
    {
      id: "pantorrillas-prensa",
      nombre: "Elevación de talones en prensa",
      recurso: pantorrillasPrensa,
      vistaEstatica: pantorrillasPrensaEstatico,
      indicacion:
        "Variante para pantorrillas, distinta de la prensa de piernas habitual. Mantén el apoyo del antepié y no bloquees las rodillas.",
    },
  ],
  "estacion-poleas": [
    {
      id: "face-pull",
      nombre: "Face pull con cuerda",
      recurso: facePull,
      vistaEstatica: facePullEstatico,
      indicacion:
        "Usa una cuerda en polea alta y acerca las manos a los lados del rostro sin arquear la espalda.",
    },
    {
      id: "abdominal-polea",
      nombre: "Abdominal de rodillas en polea",
      recurso: abdominalPolea,
      vistaEstatica: abdominalPoleaEstatico,
      indicacion:
        "Requiere polea alta y cuerda. Flexiona el tronco de forma controlada; no se trata de una máquina abdominal sentada.",
    },
    {
      id: "curl-poleas-altas",
      nombre: "Curl de bíceps en poleas altas",
      recurso: curlPoleas,
      vistaEstatica: curlPoleasEstatico,
      indicacion:
        "Requiere dos poleas altas enfrentadas. Ajusta ambos lados a la misma altura y evita mover los hombros.",
    },
    {
      id: "remo-vertical-polea",
      nombre: "Remo vertical en polea baja",
      recurso: remoVertical,
      vistaEstatica: remoVerticalEstatico,
      indicacion:
        "Usa una barra en polea baja y un recorrido cómodo para los hombros, sin elevarlos por encima de lo tolerable.",
    },
  ],
};

export function obtenerDemostracionesLocales(
  maquinaId: string,
): readonly DemostracionLocal[] {
  return Object.hasOwn(DEMOSTRACIONES, maquinaId)
    ? DEMOSTRACIONES[maquinaId]
    : [];
}
