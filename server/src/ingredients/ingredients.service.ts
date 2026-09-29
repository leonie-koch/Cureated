import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BlsFoodsService } from '../bls-foods/bls-foods.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { MatchBlsFoodDto } from './dto/match-bls-food.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';

@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blsFoodsService: BlsFoodsService,
  ) {}

  async create(dto: CreateIngredientDto) {
    try {
      return await this.prisma.ingredient.create({
        data: {
          name: dto.name,
          defaultUnit: dto.defaultUnit,
        },
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.ingredient.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with id "${id}" not found`);
    }

    return ingredient;
  }

  async update(id: string, dto: UpdateIngredientDto) {
    try {
      return await this.prisma.ingredient.update({
        where: { id },
        data: {
          name: dto.name,
          defaultUnit: dto.defaultUnit,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Ingredient with id "${id}" not found`);
      }
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.ingredient.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Ingredient with id "${id}" not found`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Ingredient is still referenced by recipes and cannot be deleted.',
        );
      }
      throw error;
    }
  }

  /**
   * Confirms a user-picked BLS food match for this ingredient. Only stores
   * the reference (blsFoodCode) — nutrient values are resolved live from
   * BLS on demand (see RecipesService.recomputePropertyScores and
   * RecipesService.getMicronutrients), so there's one place these numbers
   * live instead of a copy to keep in sync.
   */
  async matchToBlsFood(id: string, dto: MatchBlsFoodDto) {
    await this.findOne(id);
    await this.blsFoodsService.assertExists(dto.blsFoodCode);

    return this.prisma.ingredient.update({
      where: { id },
      data: { blsFoodCode: dto.blsFoodCode },
    });
  }

  private throwKnownPrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new BadRequestException('Ingredient name must be unique.');
    }
  }
}
