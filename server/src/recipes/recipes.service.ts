import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IngredientsService } from '../ingredients/ingredients.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

const RECIPE_INCLUDE = {
  recipeIngredients: {
    include: {
      ingredient: true,
    },
  },
  propertyScores: {
    include: {
      property: true,
    },
  },
} satisfies Prisma.RecipeInclude;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingredientsService: IngredientsService,
  ) {}

  async create(dto: CreateRecipeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.create({
          data: {
            title: dto.title,
            description: dto.description,
            servings: dto.servings,
            prepMinutes: dto.prepMinutes,
            cookMinutes: dto.cookMinutes,
            instructions: dto.instructions,
          },
        });

        if (dto.ingredients?.length) {
          await tx.recipeIngredient.createMany({
            data: dto.ingredients.map((ingredient) => ({
              recipeId: recipe.id,
              ingredientId: ingredient.ingredientId,
              amount: ingredient.amount,
              unit: ingredient.unit,
            })),
          });
        }

        await this.recomputePropertyScores(tx, recipe.id);

        return tx.recipe.findUniqueOrThrow({
          where: { id: recipe.id },
          include: RECIPE_INCLUDE,
        });
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      include: RECIPE_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: RECIPE_INCLUDE,
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${id}" not found`);
    }

    return recipe;
  }

  async update(id: string, dto: UpdateRecipeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.recipe.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!existing) {
          throw new NotFoundException(`Recipe with id "${id}" not found`);
        }

        await tx.recipe.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            servings: dto.servings,
            prepMinutes: dto.prepMinutes,
            cookMinutes: dto.cookMinutes,
            instructions: dto.instructions,
          },
        });

        if (dto.ingredients) {
          await tx.recipeIngredient.deleteMany({
            where: { recipeId: id },
          });

          if (dto.ingredients.length) {
            await tx.recipeIngredient.createMany({
              data: dto.ingredients.map((ingredient) => ({
                recipeId: id,
                ingredientId: ingredient.ingredientId,
                amount: ingredient.amount,
                unit: ingredient.unit,
              })),
            });
          }
        }

        await this.recomputePropertyScores(tx, id);

        return tx.recipe.findUniqueOrThrow({
          where: { id },
          include: RECIPE_INCLUDE,
        });
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.recipe.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Recipe with id "${id}" not found`);
      }
      throw error;
    }
  }

  private async recomputePropertyScores(
    tx: Prisma.TransactionClient,
    recipeId: string,
  ) {
    const recipe = await tx.recipe.findUnique({
      where: { id: recipeId },
      select: {
        recipeIngredients: {
          select: {
            amount: true,
            unit: true,
            ingredient: {
              select: {
                id: true,
                name: true,
                kcalPer100g: true,
                sugarPer100g: true,
                magnesiumPer100gMg: true,
                vitaminB12Per100g: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      return;
    }

    let totalMassG = 0;
    let totalSugarG = 0;
    let totalMagnesiumMg = 0;
    let totalVitaminB12Ug = 0;

    for (const item of recipe.recipeIngredients) {
      const nutrients =
        await this.ingredientsService.resolveNutrientsForIngredient(
          tx,
          item.ingredient,
        );
      const grams = this.toGrams(item.amount, item.unit);
      if (!Number.isFinite(grams) || grams <= 0) {
        continue;
      }

      totalMassG += grams;
      totalSugarG += grams * ((nutrients.sugarPer100g ?? 0) / 100);
      totalMagnesiumMg += grams * ((nutrients.magnesiumPer100gMg ?? 0) / 100);
      totalVitaminB12Ug += grams * ((nutrients.vitaminB12Per100g ?? 0) / 100);
    }

    const sugarPer100g = totalMassG > 0 ? (totalSugarG / totalMassG) * 100 : 0;
    const magnesiumPer100g =
      totalMassG > 0 ? (totalMagnesiumMg / totalMassG) * 100 : 0;
    const vitaminB12Per100g =
      totalMassG > 0 ? (totalVitaminB12Ug / totalMassG) * 100 : 0;

    const magnesiumScore = this.normalize(magnesiumPer100g, 20, 80);
    const b12Score = this.normalize(vitaminB12Per100g, 0.2, 1.0);

    const scoreByKey = new Map<string, number>([
      ['zuckerarm', this.inverseNormalize(sugarPer100g, 5, 15)],
      ['magnesiumreich', magnesiumScore],
      ['vitamin_b12_reich', b12Score],
      ['mitochondrien_support', Math.min(magnesiumScore, b12Score)],
    ]);

    const properties = await tx.property.findMany({
      where: {
        key: {
          in: Array.from(scoreByKey.keys()),
        },
      },
      select: {
        id: true,
        key: true,
      },
    });

    const rows = properties.map((property) => ({
      recipeId,
      propertyId: property.id,
      score: scoreByKey.get(property.key) ?? 0,
    }));

    await tx.recipePropertyScore.deleteMany({
      where: { recipeId },
    });

    if (rows.length) {
      await tx.recipePropertyScore.createMany({
        data: rows,
      });
    }
  }

  private normalize(value: number, min: number, max: number): number {
    if (value <= min) {
      return 0;
    }
    if (value >= max) {
      return 1;
    }
    return (value - min) / (max - min);
  }

  private inverseNormalize(value: number, min: number, max: number): number {
    if (value <= min) {
      return 1;
    }
    if (value >= max) {
      return 0;
    }
    return (max - value) / (max - min);
  }

  private toGrams(amount: number, unit: string): number {
    const normalizedUnit = unit.trim().toLowerCase();
    const multipliers: Record<string, number> = {
      g: 1,
      gram: 1,
      grams: 1,
      kg: 1000,
      mg: 0.001,
      oz: 28.3495,
      lb: 453.592,
      ml: 1,
      l: 1000,
      tsp: 5,
      tbsp: 15,
      cup: 240,
    };

    const multiplier = multipliers[normalizedUnit];
    return multiplier ? amount * multiplier : NaN;
  }

  private throwKnownPrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2003') {
      throw new BadRequestException(
        'One or more ingredientIds do not exist or violate relation constraints.',
      );
    }

    if (error.code === 'P2002') {
      throw new BadRequestException(
        'Duplicate recipe ingredients are not allowed.',
      );
    }
  }
}
