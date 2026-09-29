import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ATOMIC_PROPERTY_DEFINITIONS,
  PROTEIN_RICH_PROPERTY,
} from './atomic-properties.js';
import {
  CreateRecipeDto,
  RecipeIngredientInputDto,
} from './dto/create-recipe.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';

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

// BLS 4.0 nutrient component groups that make up "micronutrients" (vitamins
// and minerals), as opposed to macronutrients, amino/fatty acids, energy,
// etc. — see the `group` values on BlsNutrientComponent. Order here is the
// display order on the recipe detail page.
const MICRONUTRIENT_GROUPS = [
  'Fettlösliche Vitamine',
  'Wasserlösliche Vitamine',
  'Elemente',
] as const;

export type RecipeMicronutrient = {
  code: string;
  nameDe: string;
  nameEn: string | null;
  unit: string;
  group: string;
  // Total amount in this recipe, summed across all matched ingredients by
  // their amount. Null when none of the recipe's BLS-matched ingredients
  // have a value for this nutrient (not the same as a confirmed zero).
  amount: number | null;
};

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

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
            data: await this.resolveRecipeIngredientRows(
              tx,
              recipe.id,
              dto.ingredients,
            ),
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

  /**
   * Total micronutrient content of the whole recipe (not per 100g or per
   * serving): each BLS-matched ingredient's per-100g value scaled by its
   * amount in the recipe, summed across ingredients. Ingredients without a
   * confirmed BLS match contribute nothing, same limitation as
   * recomputePropertyScores. Returns every vitamin/mineral component BLS
   * tracks (see MICRONUTRIENT_GROUPS), not just the ones this recipe has
   * data for, so the caller can show "no data" rather than omit them.
   */
  async getMicronutrients(id: string): Promise<RecipeMicronutrient[]> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: {
        recipeIngredients: {
          select: {
            amount: true,
            unit: true,
            ingredient: { select: { blsFoodCode: true } },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${id}" not found`);
    }

    const gramsByFoodCode = new Map<string, number>();
    for (const item of recipe.recipeIngredients) {
      const blsFoodCode = item.ingredient.blsFoodCode;
      if (!blsFoodCode) {
        continue;
      }
      const grams = this.toGrams(item.amount, item.unit);
      if (!Number.isFinite(grams) || grams <= 0) {
        continue;
      }
      gramsByFoodCode.set(
        blsFoodCode,
        (gramsByFoodCode.get(blsFoodCode) ?? 0) + grams,
      );
    }

    const components = await this.prisma.blsNutrientComponent.findMany({
      where: { group: { in: [...MICRONUTRIENT_GROUPS] } },
      select: {
        code: true,
        nameDe: true,
        nameEn: true,
        unit: true,
        group: true,
      },
    });

    const amountByCode = new Map<string, number>();
    if (gramsByFoodCode.size > 0) {
      const rows = await this.prisma.blsFoodNutrient.findMany({
        where: {
          foodCode: { in: Array.from(gramsByFoodCode.keys()) },
          componentCode: { in: components.map((c) => c.code) },
          value: { not: null },
        },
        select: { foodCode: true, componentCode: true, value: true },
      });

      for (const row of rows) {
        const grams = gramsByFoodCode.get(row.foodCode) ?? 0;
        const contribution = (grams / 100) * row.value!;
        amountByCode.set(
          row.componentCode,
          (amountByCode.get(row.componentCode) ?? 0) + contribution,
        );
      }
    }

    const groupOrder = new Map<string, number>(
      MICRONUTRIENT_GROUPS.map((group, index) => [group, index]),
    );

    return components
      .map((component) => {
        const amount = amountByCode.get(component.code);
        return {
          code: component.code,
          nameDe: component.nameDe,
          nameEn: component.nameEn,
          unit: component.unit,
          group: component.group!,
          // Rounded to avoid floating-point noise from summing per-100g
          // values across ingredients (e.g. 1.6099999999999999).
          amount: amount != null ? Math.round(amount * 1000) / 1000 : null,
        };
      })
      .sort((a, b) => {
        const groupDiff =
          (groupOrder.get(a.group) ?? 0) - (groupOrder.get(b.group) ?? 0);
        return groupDiff !== 0 ? groupDiff : a.nameDe.localeCompare(b.nameDe);
      });
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
              data: await this.resolveRecipeIngredientRows(
                tx,
                id,
                dto.ingredients,
              ),
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

  private async resolveRecipeIngredientRows(
    tx: Prisma.TransactionClient,
    recipeId: string,
    ingredients: RecipeIngredientInputDto[],
  ): Promise<Prisma.RecipeIngredientCreateManyInput[]> {
    const rows: Prisma.RecipeIngredientCreateManyInput[] = [];

    for (const ingredient of ingredients) {
      const ingredientId = await this.resolveIngredientId(tx, ingredient);
      rows.push({
        recipeId,
        ingredientId,
        amount: ingredient.amount,
        unit: ingredient.unit,
      });
    }

    return rows;
  }

  private async resolveIngredientId(
    tx: Prisma.TransactionClient,
    input: Pick<RecipeIngredientInputDto, 'name' | 'blsFoodCode'>,
  ): Promise<string> {
    if (input.blsFoodCode) {
      return this.resolveIngredientIdByBlsFoodCode(tx, input.blsFoodCode);
    }

    if (!input.name?.trim()) {
      throw new BadRequestException(
        'Each ingredient needs a name or a blsFoodCode.',
      );
    }

    const trimmed = input.name.trim();
    const existing = await tx.ingredient.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }

    const created = await tx.ingredient.create({
      data: { name: trimmed },
      select: { id: true },
    });
    return created.id;
  }

  private async resolveIngredientIdByBlsFoodCode(
    tx: Prisma.TransactionClient,
    blsFoodCode: string,
  ): Promise<string> {
    const alreadyMatched = await tx.ingredient.findFirst({
      where: { blsFoodCode },
      select: { id: true },
    });
    if (alreadyMatched) {
      return alreadyMatched.id;
    }

    const blsFood = await tx.blsFood.findUnique({
      where: { blsCode: blsFoodCode },
      select: { nameDe: true },
    });
    if (!blsFood) {
      throw new NotFoundException(
        `BLS food with code "${blsFoodCode}" not found`,
      );
    }

    // An ingredient with this name may already exist from free-text entry
    // before this ingredient list existed — match it retroactively instead
    // of creating a duplicate that collides on the unique name.
    const existingByName = await tx.ingredient.findFirst({
      where: { name: { equals: blsFood.nameDe, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existingByName) {
      const updated = await tx.ingredient.update({
        where: { id: existingByName.id },
        data: { blsFoodCode },
        select: { id: true },
      });
      return updated.id;
    }

    const created = await tx.ingredient.create({
      data: { name: blsFood.nameDe, blsFoodCode },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Scores the recipe against every ATOMIC_PROPERTY_DEFINITIONS entry, plus
   * the protein-energy-ratio-based PROTEIN_RICH_PROPERTY and the
   * (still-unseeded, see prisma/seed.ts) "mitochondrien_support" composite.
   * Only ingredients with a confirmed BLS match contribute nutrient data —
   * an unmatched ingredient's mass still counts toward the recipe's total
   * (diluting concentration-based thresholds), but contributes 0 to every
   * nutrient, same limitation as RecipesService.getMicronutrients.
   */
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
                blsFoodCode: true,
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
    const gramsByFoodCode = new Map<string, number>();

    for (const item of recipe.recipeIngredients) {
      const grams = this.toGrams(item.amount, item.unit);
      if (!Number.isFinite(grams) || grams <= 0) {
        continue;
      }

      totalMassG += grams;
      if (item.ingredient.blsFoodCode) {
        gramsByFoodCode.set(
          item.ingredient.blsFoodCode,
          (gramsByFoodCode.get(item.ingredient.blsFoodCode) ?? 0) + grams,
        );
      }
    }

    const allCodes = Array.from(
      new Set([
        ...ATOMIC_PROPERTY_DEFINITIONS.flatMap((def) => def.codes),
        'PROT625',
      ]),
    );

    const totalByCode = new Map<string, number>();
    if (gramsByFoodCode.size > 0) {
      const rows = await tx.blsFoodNutrient.findMany({
        where: {
          foodCode: { in: Array.from(gramsByFoodCode.keys()) },
          componentCode: { in: allCodes },
          value: { not: null },
        },
        select: { foodCode: true, componentCode: true, value: true },
      });

      for (const row of rows) {
        const grams = gramsByFoodCode.get(row.foodCode) ?? 0;
        const contribution = (grams / 100) * row.value!;
        totalByCode.set(
          row.componentCode,
          (totalByCode.get(row.componentCode) ?? 0) + contribution,
        );
      }
    }

    // Concentration (per 100g of the whole recipe) of the given nutrient
    // code(s) summed together — the unit every threshold above is defined
    // in.
    const per100g = (codes: string[]): number => {
      if (totalMassG <= 0) {
        return 0;
      }
      const total = codes.reduce(
        (sum, code) => sum + (totalByCode.get(code) ?? 0),
        0,
      );
      return (total / totalMassG) * 100;
    };

    const scoreByKey = new Map<string, number>();
    for (const def of ATOMIC_PROPERTY_DEFINITIONS) {
      const value = per100g(def.codes);
      scoreByKey.set(
        def.key,
        def.direction === 'low'
          ? this.inverseNormalize(value, def.min, def.max)
          : this.normalize(value, def.min, def.max),
      );
    }

    const proteinPer100g = per100g(['PROT625']);
    const kcalPer100g = per100g(['ENERCC']);
    const proteinEnergyRatioPercent =
      kcalPer100g > 0 ? ((proteinPer100g * 4) / kcalPer100g) * 100 : 0;
    scoreByKey.set(
      PROTEIN_RICH_PROPERTY.key,
      this.normalize(
        proteinEnergyRatioPercent,
        PROTEIN_RICH_PROPERTY.min,
        PROTEIN_RICH_PROPERTY.max,
      ),
    );

    const magnesiumScore = scoreByKey.get('magnesiumreich') ?? 0;
    const b12Score = scoreByKey.get('vitamin_b12_reich') ?? 0;
    scoreByKey.set('mitochondrien_support', Math.min(magnesiumScore, b12Score));

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
