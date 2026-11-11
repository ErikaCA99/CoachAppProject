import { z } from "zod";

export const busquedaSchema = z.strictObject({
  consulta: z.string().trim().min(2).max(100),
  tamanoPagina: z.number().int().min(1).max(25).default(15),
});
export const alimentoSchema = z.object({
  fdcId: z.number().int().positive(),
  description: z.string().max(1000),
  dataType: z.string().max(100),
  foodCategory: z.string().max(300).optional(),
  foodNutrients: z
    .array(
      z.object({
        nutrientId: z.number().int(),
        nutrientName: z.string().max(200),
        nutrientNumber: z.string().max(20).optional(),
        unitName: z.string().max(30),
        value: z.number().finite(),
      }),
    )
    .max(200),
});
export const respuestaUsdaSchema = z.object({
  foods: z.array(alimentoSchema).max(25),
});
