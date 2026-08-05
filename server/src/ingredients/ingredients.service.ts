import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

type NutrientProfile = {
  kcalPer100g: number;
  sugarPer100g: number;
  magnesiumPer100gMg: number;
  vitaminB12Per100g: number;
};

const MOCK_NUTRIENT_CATALOG: Record<string, NutrientProfile> = {
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIngredientDto) {
    try {
      return await this.prisma.ingredient.create({
        data: {
          name: dto.name,
          defaultUnit: dto.defaultUnit,
          kcalPer100g: dto.kcalPer100g,
          sugarPer100g: dto.sugarPer100g,
          magnesiumPer100gMg: dto.magnesiumPer100gMg,
          vitaminB12Per100g: dto.vitaminB12Per100g,
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
          kcalPer100g: dto.kcalPer100g,
          sugarPer100g: dto.sugarPer100g,
          magnesiumPer100gMg: dto.magnesiumPer100gMg,
          vitaminB12Per100g: dto.vitaminB12Per100g,
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

  private throwKnownPrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new BadRequestException('Ingredient name must be unique.');
    }
  }

  async resolveNutrientsForIngredient(
    tx: Prisma.TransactionClient,
    ingredient: {
      id: string;
      name: string;
      kcalPer100g: number | null;
      sugarPer100g: number | null;
      magnesiumPer100gMg: number | null;
      vitaminB12Per100g: number | null;
    },
  ) {
    const hasAllNutrients =
      ingredient.kcalPer100g !== null &&
      ingredient.sugarPer100g !== null &&
      ingredient.magnesiumPer100gMg !== null &&
      ingredient.vitaminB12Per100g !== null;

    if (hasAllNutrients) {
      return ingredient;
    }

    const profile = this.lookupProfile(ingredient.name);
    if (!profile) {
      return ingredient;
    }

    return tx.ingredient.update({
      where: { id: ingredient.id },
      data: {
        kcalPer100g: ingredient.kcalPer100g ?? profile.kcalPer100g,
        sugarPer100g: ingredient.sugarPer100g ?? profile.sugarPer100g,
        magnesiumPer100gMg:
          ingredient.magnesiumPer100gMg ?? profile.magnesiumPer100gMg,
        vitaminB12Per100g:
          ingredient.vitaminB12Per100g ?? profile.vitaminB12Per100g,
      },
      select: {
        id: true,
        name: true,
        kcalPer100g: true,
        sugarPer100g: true,
        magnesiumPer100gMg: true,
        vitaminB12Per100g: true,
      },
    });
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private lookupProfile(name: string): NutrientProfile | null {
    return MOCK_NUTRIENT_CATALOG[this.normalizeName(name)] ?? null;
  }
}
