import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { MatchBlsFoodDto } from './dto/match-bls-food.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { IngredientsService } from './ingredients.service.js';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  create(@Body() createIngredientDto: CreateIngredientDto) {
    return this.ingredientsService.create(createIngredientDto);
  }

  @Get()
  findAll() {
    return this.ingredientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
  ) {
    return this.ingredientsService.update(id, updateIngredientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }

  @Patch(':id/bls-match')
  matchToBlsFood(
    @Param('id') id: string,
    @Body() matchBlsFoodDto: MatchBlsFoodDto,
  ) {
    return this.ingredientsService.matchToBlsFood(id, matchBlsFoodDto);
  }
}
