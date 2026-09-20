import { RecipeIngredientInputDto } from './create-recipe.dto.js';

export class UpdateRecipeDto {
  title?: string;
  description?: string | null;
  servings?: number | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  instructions?: string | null;
  ingredients?: RecipeIngredientInputDto[];
}
