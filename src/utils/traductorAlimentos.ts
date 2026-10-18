/**
 * Traducción mínima español → inglés para consultar USDA FoodData Central,
 * cuya base de datos está solo en inglés. Utilidad pura, sin dependencias.
 *
 * Estrategia: 1) frases completas ("pechuga de pollo"), 2) palabra por
 * palabra, 3) las palabras desconocidas se envían tal cual (así un usuario
 * que escriba directamente en inglés también obtiene resultados).
 */

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Frases que no se traducen bien palabra por palabra. */
const FRASES: Record<string, string> = {
  "pechuga de pollo": "chicken breast",
  "muslo de pollo": "chicken thigh",
  "clara de huevo": "egg white",
  "yema de huevo": "egg yolk",
  "carne molida": "ground beef",
  "carne de res": "beef",
  "carne de cerdo": "pork",
  "arroz integral": "brown rice",
  "arroz blanco": "white rice",
  "pan integral": "whole wheat bread",
  "pan blanco": "white bread",
  "leche descremada": "milk nonfat",
  "leche entera": "milk whole",
  "leche de soya": "soymilk",
  "papa frita": "french fries",
  "papas fritas": "french fries",
  "mantequilla de mani": "peanut butter",
  "aceite de oliva": "olive oil",
  "queso fresco": "queso fresco",
  "a la plancha": "grilled",
  "al horno": "baked",
};

const PALABRAS: Record<string, string> = {
  // Cereales y tubérculos
  arroz: "rice",
  pan: "bread",
  fideo: "pasta",
  fideos: "pasta",
  tallarin: "spaghetti",
  tallarines: "spaghetti",
  avena: "oats",
  quinua: "quinoa",
  quinoa: "quinoa",
  trigo: "wheat",
  maiz: "corn",
  choclo: "corn sweet",
  papa: "potato",
  papas: "potato",
  camote: "sweet potato",
  yuca: "cassava",
  galleta: "cookies",
  galletas: "cookies",
  cereal: "cereal",
  // Proteínas
  pollo: "chicken",
  pechuga: "breast",
  huevo: "egg",
  huevos: "egg",
  carne: "beef",
  res: "beef",
  cerdo: "pork",
  chancho: "pork",
  cordero: "lamb",
  pescado: "fish",
  atun: "tuna",
  salmon: "salmon",
  trucha: "trout",
  sardina: "sardine",
  sardinas: "sardine",
  jamon: "ham",
  salchicha: "sausage",
  chorizo: "chorizo",
  higado: "liver",
  // Legumbres y frutos secos
  lenteja: "lentils",
  lentejas: "lentils",
  frijol: "beans",
  frijoles: "beans",
  poroto: "beans",
  porotos: "beans",
  garbanzo: "chickpeas",
  garbanzos: "chickpeas",
  arveja: "peas",
  arvejas: "peas",
  haba: "broad beans",
  habas: "broad beans",
  mani: "peanuts",
  almendra: "almonds",
  almendras: "almonds",
  nuez: "walnuts",
  nueces: "walnuts",
  // Lácteos y grasas
  leche: "milk",
  yogur: "yogurt",
  yogurt: "yogurt",
  queso: "cheese",
  mantequilla: "butter",
  aceite: "oil",
  crema: "cream",
  // Frutas
  platano: "banana",
  banana: "banana",
  manzana: "apple",
  naranja: "orange",
  mandarina: "tangerine",
  pera: "pear",
  uva: "grapes",
  uvas: "grapes",
  frutilla: "strawberries",
  frutillas: "strawberries",
  fresa: "strawberries",
  fresas: "strawberries",
  sandia: "watermelon",
  melon: "melon",
  pina: "pineapple",
  papaya: "papaya",
  mango: "mango",
  durazno: "peach",
  palta: "avocado",
  aguacate: "avocado",
  limon: "lemon",
  kiwi: "kiwi",
  coco: "coconut",
  // Verduras
  tomate: "tomato",
  cebolla: "onion",
  zanahoria: "carrot",
  lechuga: "lettuce",
  brocoli: "broccoli",
  espinaca: "spinach",
  pepino: "cucumber",
  zapallo: "squash",
  calabaza: "pumpkin",
  repollo: "cabbage",
  pimenton: "pepper sweet",
  ajo: "garlic",
  vainita: "green beans",
  vainitas: "green beans",
  beterraga: "beets",
  remolacha: "beets",
  coliflor: "cauliflower",
  apio: "celery",
  // Otros
  azucar: "sugar",
  miel: "honey",
  chocolate: "chocolate",
  cafe: "coffee",
  te: "tea",
  jugo: "juice",
  gaseosa: "cola",
  cerveza: "beer",
  // Preparación / estado
  cocido: "cooked",
  cocida: "cooked",
  cocidos: "cooked",
  cocidas: "cooked",
  hervido: "boiled",
  hervida: "boiled",
  frito: "fried",
  frita: "fried",
  fritos: "fried",
  fritas: "fried",
  asado: "roasted",
  asada: "roasted",
  plancha: "grilled",
  horneado: "baked",
  horneada: "baked",
  crudo: "raw",
  cruda: "raw",
  blanco: "white",
  blanca: "white",
  integral: "whole grain",
  descremado: "nonfat",
  descremada: "nonfat",
  entero: "whole",
  entera: "whole",
  seco: "dried",
  seca: "dried",
};

const PALABRAS_VACIAS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "a",
  "al",
  "en",
  "y",
  "un",
  "una",
]);

export interface ConsultaTraducida {
  consulta: string;
  /** `true` si al menos una palabra se tradujo. */
  traducida: boolean;
}

export function traducirConsulta(texto: string): ConsultaTraducida {
  let normalizado = normalizarTexto(texto);
  let traducida = false;

  // Primero las frases más largas, para que "pan integral" gane a "pan".
  const frases = Object.keys(FRASES).sort((a, b) => b.length - a.length);
  for (const frase of frases) {
    if (normalizado.includes(frase)) {
      normalizado = normalizado.replace(frase, ` ${FRASES[frase]} `);
      traducida = true;
    }
  }

  const palabras = normalizado
    .split(" ")
    .filter((p) => p.length > 0 && !PALABRAS_VACIAS.has(p))
    .map((p) => {
      const traduccion = PALABRAS[p];
      if (traduccion) traducida = true;
      return traduccion ?? p;
    });

  return { consulta: palabras.join(" ").trim(), traducida };
}

/** "arroz cocido" → "Arroz cocido" */
export function capitalizar(texto: string): string {
  const limpio = texto.trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * Frases compuestas inglés → español para descripciones de USDA.
 * Se evalúan primero para evitar traducciones parciales erróneas.
 */
const FRASES_EN_ES: Record<string, string> = {
  "rose-apples": "pomagás (manzana de agua)",
  "fruit butters": "mantequilla/dulce de fruta",
  "sweet potato": "camote",
  "sweet potatoes": "camotes",
  "green beans": "vainitas",
  "broad beans": "habas",
  "sweet pepper": "pimiento dulce",
  "sweet peppers": "pimientos dulces",
  "chia seeds": "semillas de chía",
  "chicken breast": "pechuga de pollo",
  "chicken thigh": "muslo de pollo",
  "chicken wing": "ala de pollo",
  "chicken wings": "alas de pollo",
  "ground beef": "carne molida",
  "pork chops": "chuletas de cerdo",
  "egg white": "clara de huevo",
  "egg whites": "claras de huevo",
  "egg yolk": "yema de huevo",
  "egg yolks": "yemas de huevo",
  "peanut butter": "mantequilla de maní",
  "olive oil": "aceite de oliva",
  "vegetable oil": "aceite vegetal",
  "cottage cheese": "queso cottage",
  "sour cream": "crema agria",
  "brown rice": "arroz integral",
  "white rice": "arroz blanco",
  "whole wheat": "trigo integral",
  "whole-wheat": "trigo integral",
  "long-grain": "grano largo",
  "short-grain": "grano corto",
  "medium-grain": "grano medio",
  "with skin": "con cáscara",
  "without skin": "sin cáscara",
  "with peel": "con cáscara",
  "without peel": "sin cáscara",
  "meat only": "solo carne",
  "meat and skin": "carne y piel",
  "skin only": "solo piel",
  "canned in water": "enlatado en agua",
  "canned in oil": "enlatado en aceite",
  "drained solids": "escurrido",
  "solids and liquids": "sólidos y líquido",
  "commercially prepared": "comercial",
  "all commercial varieties": "todas las variedades",
  "all varieties": "todas las variedades",
  "without salt": "sin sal",
  "with salt": "con sal",
  "not fortified": "sin fortificar",
};

const PALABRAS_EN_ES: Record<string, string> = {
  apples: "manzanas",
  apple: "manzana",
  bananas: "plátanos",
  banana: "plátano",
  oranges: "naranjas",
  orange: "naranja",
  strawberries: "frutillas/fresas",
  strawberry: "frutilla/fresa",
  blueberries: "arándanos",
  blueberry: "arándano",
  avocados: "paltas",
  avocado: "palta",
  grapes: "uvas",
  grape: "uva",
  peaches: "duraznos",
  peach: "durazno",
  pears: "peras",
  pear: "pera",
  pineapples: "piñas",
  pineapple: "piña",
  watermelons: "sandías",
  watermelon: "sandía",
  melons: "melones",
  melon: "melón",
  lemons: "limones",
  lemon: "limón",
  limes: "limas",
  lime: "lima",
  papayas: "papayas",
  papaya: "papaya",
  mangoes: "mangos",
  mango: "mango",
  coconuts: "cocos",
  coconut: "coco",
  kiwis: "kiwis",
  kiwi: "kiwi",
  cherries: "cerezas",
  cherry: "cereza",
  plums: "ciruelas",
  plum: "ciruela",
  prunes: "ciruelas pasas",
  prune: "ciruela pasa",
  raisins: "pasas",
  raisin: "pasa",
  chicken: "pollo",
  turkey: "pavo",
  beef: "carne de res",
  pork: "cerdo",
  lamb: "cordero",
  fish: "pescado",
  salmon: "salmón",
  tuna: "atún",
  trout: "trucha",
  tilapia: "tilapia",
  sardines: "sardinas",
  sardine: "sardina",
  shrimp: "camarones",
  ham: "jamón",
  bacon: "tocino",
  sausage: "salchicha",
  sausages: "salchichas",
  breast: "pechuga",
  thigh: "muslo",
  thighs: "muslos",
  wing: "ala",
  wings: "alas",
  drumstick: "pierna",
  meat: "carne",
  liver: "hígado",
  steak: "bife",
  egg: "huevo",
  eggs: "huevos",
  whites: "claras",
  yolk: "yema",
  yolks: "yemas",
  milk: "leche",
  cheese: "queso",
  yogurt: "yogur",
  yoghurt: "yogur",
  butter: "mantequilla",
  cream: "crema",
  rice: "arroz",
  bread: "pan",
  pasta: "fideos/pasta",
  noodles: "fideos",
  spaghetti: "espaguetis",
  oats: "avena",
  oatmeal: "avena",
  corn: "maíz",
  potato: "papa",
  potatoes: "papas",
  quinoa: "quinua",
  flour: "harina",
  beans: "frijoles",
  lentils: "lentejas",
  chickpeas: "garbanzos",
  peas: "arvejas",
  peanuts: "maní",
  almonds: "almendras",
  almond: "almendra",
  walnuts: "nueces",
  walnut: "nuez",
  tomato: "tomate",
  tomatoes: "tomates",
  onion: "cebolla",
  onions: "cebollas",
  garlic: "ajo",
  lettuce: "lechuga",
  spinach: "espinaca",
  broccoli: "brócoli",
  carrot: "zanahoria",
  carrots: "zanahorias",
  cucumber: "pepino",
  cucumbers: "pepinos",
  celery: "apio",
  cauliflower: "coliflor",
  mushrooms: "champiñones",
  mushroom: "champiñón",
  pepper: "pimiento",
  peppers: "pimientos",
  zucchini: "calabacín",
  pumpkin: "calabaza",
  cabbage: "repollo",
  beets: "remolacha",
  babyfood: "comida infantil",
  juice: "jugo",
  nectar: "néctar",
  oil: "aceite",
  sugar: "azúcar",
  salt: "sal",
  water: "agua",
  strudel: "strudel",
  croissant: "croissant",
  croissants: "croissants",
  raw: "crudo",
  cooked: "cocido",
  boiled: "hervido",
  roasted: "asado",
  baked: "al horno",
  fried: "frito",
  grilled: "a la plancha",
  steamed: "al vapor",
  dried: "deshidratado",
  fresh: "fresco",
  uncooked: "sin cocinar",
  unprepared: "sin preparar",
  prepared: "preparado",
  frozen: "congelado",
  canned: "enlatado",
  strained: "colado",
  dices: "en cubos",
  toddler: "niños",
  whole: "entero",
  white: "blanco",
  nonfat: "descremado",
  sweetened: "endulzado",
  unsweetened: "sin azúcar",
  lean: "magro",
  fat: "grasa",
  regular: "común",
  sulfured: "sulfitado",
  skinless: "sin piel",
};

/**
 * Traduce una descripción de alimento de USDA FoodData Central al español.
 * Preserva la estructura descriptiva y traduce tanto frases comunes como palabras clave.
 */
export function traducirDescripcionUSDA(descripcion: string): string {
  if (!descripcion) return "";

  const segmentos = descripcion.split(",").map((s) => s.trim());
  const llavesFrases = Object.keys(FRASES_EN_ES).sort(
    (a, b) => b.length - a.length,
  );
  const llavesPalabras = Object.keys(PALABRAS_EN_ES).sort(
    (a, b) => b.length - a.length,
  );

  const traducidos = segmentos.map((segmento) => {
    let s = segmento.toLowerCase();

    for (const frase of llavesFrases) {
      if (s.includes(frase)) {
        const regex = new RegExp(`\\b${frase.replace(/[-]/g, "\\-")}\\b`, "gi");
        s = s.replace(regex, FRASES_EN_ES[frase]);
      }
    }

    for (const palabra of llavesPalabras) {
      const regex = new RegExp(`\\b${palabra}\\b`, "gi");
      if (regex.test(s)) {
        s = s.replace(regex, PALABRAS_EN_ES[palabra]);
      }
    }

    return s.trim();
  });

  const textoFinal = traducidos.filter(Boolean).join(", ");
  return capitalizar(textoFinal);
}
