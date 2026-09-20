export class RecipeIngredientInputDto {
  name?: string;
  blsFoodCode?: string;
  amount: number;
  unit: string;
}

export class CreateRecipeDto {
  title: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  instructions?: string;
  ingredients?: RecipeIngredientInputDto[];
}
