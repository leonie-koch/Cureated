import { Module } from '@nestjs/common';
import { IngredientsModule } from '../ingredients/ingredients.module.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [IngredientsModule],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
