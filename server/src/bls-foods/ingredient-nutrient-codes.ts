// Maps the Ingredient nutrient fields we track to their BLS 4.0 nutrient
// component codes (see server/prisma/import-bls.ts and
// BLS_4_0_Components_DE_EN.xlsx). Used to resolve these values live from
// BlsFoodNutrient for a matched Ingredient — see
// BlsFoodsService.getNutrientValues and
// IngredientsService.resolveNutrientsForIngredient.
export const INGREDIENT_NUTRIENT_BLS_CODES = {
  kcalPer100g: 'ENERCC',
  sugarPer100g: 'SUGAR',
  magnesiumPer100gMg: 'MG',
  vitaminB12Per100g: 'VITB12',
} as const;

export type IngredientNutrientField =
  keyof typeof INGREDIENT_NUTRIENT_BLS_CODES;

export type IngredientNutrientValues = Record<
  IngredientNutrientField,
  number | null
>;
