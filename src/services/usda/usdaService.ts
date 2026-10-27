import { z } from "zod";
import { invocarFuncion } from "@/services/firebase/functionsService";

const nutrienteSchema = z.object({
  nutrientId: z.number().int(),
  nutrientName: z.string().max(200),
  nutrientNumber: z.string().max(20).optional(),
  unitName: z.string().max(30),
  value: z.number().finite(),
});
const alimentoSchema = z.object({
  fdcId: z.number().int().positive(),
  description: z.string().max(1000),
  dataType: z.string().max(100),
  foodCategory: z.string().max(300).optional(),
  foodNutrients: z.array(nutrienteSchema).max(200),
});
const respuestaSchema = z.object({ foods: z.array(alimentoSchema).max(25) });
export type UsdaNutriente = z.infer<typeof nutrienteSchema>;
export type UsdaAlimento = z.infer<typeof alimentoSchema>;

/** Authenticated proxy: USDA credentials exist only in Secret Manager. */
export async function buscarAlimentosUsda(
  consulta: string,
  opciones: { tamanoPagina?: number; signal?: AbortSignal } = {},
): Promise<UsdaAlimento[]> {
  opciones.signal?.throwIfAborted();
  const datos = z
    .object({
      consulta: z.string().trim().min(2).max(100),
      tamanoPagina: z.number().int().min(1).max(25),
    })
    .parse({ consulta, tamanoPagina: opciones.tamanoPagina ?? 15 });
  const respuesta = await invocarFuncion(
    "buscarAlimentos",
    datos,
    respuestaSchema,
  );
  // Callable SDK has no AbortSignal; discard stale responses, never retry mutations.
  opciones.signal?.throwIfAborted();
  return respuesta.foods;
}
