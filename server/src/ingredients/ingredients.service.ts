import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BlsFoodsService } from '../bls-foods/bls-foods.service.js';
import { IngredientNutrientValues } from '../bls-foods/ingredient-nutrient-codes.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { MatchBlsFoodDto } from './dto/match-bls-food.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';

const MOCK_NUTRIENT_CATALOG: Record<string, IngredientNutrientValues> = {
  spinach: {
    kcalPer100g: 23,
    sugarPer100g: 0.42,
    magnesiumPer100gMg: 79,
    vitaminB12Per100g: 0,
  },
  spinat: {
    kcalPer100g: 23,
    sugarPer100g: 0.42,
    magnesiumPer100gMg: 79,
    vitaminB12Per100g: 0,
  },
  salmon: {
    kcalPer100g: 208,
    sugarPer100g: 0,
    magnesiumPer100gMg: 29,
    vitaminB12Per100g: 3.2,
  },
  lachs: {
    kcalPer100g: 208,
    sugarPer100g: 0,
    magnesiumPer100gMg: 29,
    vitaminB12Per100g: 3.2,
  },
  oats: {
    kcalPer100g: 389,
    sugarPer100g: 0.99,
    magnesiumPer100gMg: 138,
    vitaminB12Per100g: 0,
  },
  haferflocken: {
    kcalPer100g: 389,
    sugarPer100g: 0.99,
    magnesiumPer100gMg: 138,
    vitaminB12Per100g: 0,
  },
  blueberry: {
    kcalPer100g: 57,
    sugarPer100g: 9.96,
    magnesiumPer100gMg: 6,
    vitaminB12Per100g: 0,
  },
  blaubeeren: {
    kcalPer100g: 57,
    sugarPer100g: 9.96,
    magnesiumPer100gMg: 6,
    vitaminB12Per100g: 0,
  },
  egg: {
    kcalPer100g: 143,
    sugarPer100g: 0.37,
    magnesiumPer100gMg: 12,
    vitaminB12Per100g: 1.11,
  },
  ei: {
    kcalPer100g: 143,
    sugarPer100g: 0.37,
    magnesiumPer100gMg: 12,
    vitaminB12Per100g: 1.11,
  },
};

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
   * BLS on demand (see resolveNutrientsForIngredient), so there's one place
   * these numbers live instead of a copy to keep in sync.
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

  /**
   * Resolves the nutrient values for an ingredient without storing them
   * anywhere: live from BLS when matched, otherwise a rough guess from the
   * mock catalog by name (see MOCK_NUTRIENT_CATALOG) as a last resort until
   * it's matched. Ingredient itself carries no nutrient columns, so there's
   * exactly one place these numbers can come from at a time.
   */
  async resolveNutrientsForIngredient(ingredient: {
    name: string;
    blsFoodCode: string | null;
  }): Promise<IngredientNutrientValues> {
    if (ingredient.blsFoodCode) {
      return this.blsFoodsService.getNutrientValues(ingredient.blsFoodCode);
    }

    return (
      this.lookupProfile(ingredient.name) ?? {
        kcalPer100g: null,
        sugarPer100g: null,
        magnesiumPer100gMg: null,
        vitaminB12Per100g: null,
      }
    );
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private lookupProfile(name: string): IngredientNutrientValues | null {
    return MOCK_NUTRIENT_CATALOG[this.normalizeName(name)] ?? null;
  }
}
