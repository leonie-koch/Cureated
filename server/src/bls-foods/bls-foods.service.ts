import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
}
