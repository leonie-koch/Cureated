import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  INGREDIENT_NUTRIENT_BLS_CODES,
  IngredientNutrientField,
  IngredientNutrientValues,
} from './ingredient-nutrient-codes.js';

// BLS codes starting with these letters are prepared-dish components
// ("Menükomponenten überwiegend pflanzlich/tierisch" — see
// FOOD_GROUP_BY_LETTER in import-bls.ts), not atomic ingredients. Excluded
// from the ingredient search since a recipe here is itself built from
// ingredients — a composed dish isn't a useful match target.
const EXCLUDED_FOOD_GROUP_LETTERS = ['X', 'Y'];

@Injectable()
export class BlsFoodsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.blsFood.findMany({
      where: {
        NOT: {
          OR: EXCLUDED_FOOD_GROUP_LETTERS.map((letter) => ({
            blsCode: { startsWith: letter },
          })),
        },
      },
      select: {
        blsCode: true,
        nameDe: true,
        nameEn: true,
        foodGroup: true,
      },
      orderBy: { nameDe: 'asc' },
    });
  }

  async assertExists(blsFoodCode: string): Promise<void> {
    const food = await this.prisma.blsFood.findUnique({
      where: { blsCode: blsFoodCode },
      select: { blsCode: true },
    });
    if (!food) {
      throw new NotFoundException(
        `BLS food with code "${blsFoodCode}" not found`,
      );
    }
  }

  /**
   * Reads the handful of nutrient values Ingredient cares about, live from
   * BlsFoodNutrient. Not cached on the Ingredient itself, so there's a
   * single source of truth for these numbers instead of a copy that can
   * drift out of sync. A value that exists in BLS but only as a qualifier
   * (e.g. "TR") comes back as null, same as if BLS had no data for it at
   * all — Ingredient's nutrient fields don't carry a qualifier concept.
   */
  async getNutrientValues(
    blsFoodCode: string,
  ): Promise<IngredientNutrientValues> {
    await this.assertExists(blsFoodCode);

    const codes = Object.values(INGREDIENT_NUTRIENT_BLS_CODES);
    const rows = await this.prisma.blsFoodNutrient.findMany({
      where: { foodCode: blsFoodCode, componentCode: { in: codes } },
      select: { componentCode: true, value: true },
    });
    const valueByCode = new Map(rows.map((r) => [r.componentCode, r.value]));

    const values = {} as IngredientNutrientValues;
    for (const [field, code] of Object.entries(
      INGREDIENT_NUTRIENT_BLS_CODES,
    ) as [IngredientNutrientField, string][]) {
      values[field] = valueByCode.get(code) ?? null;
    }
    return values;
  }
}
