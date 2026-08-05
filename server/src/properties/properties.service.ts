import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

const PROPERTY_INCLUDE = {
  conditionWeights: {
    include: {
      condition: true,
    },
  },
  recipeScores: {
    include: {
      recipe: true,
    },
  },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePropertyDto) {
    try {
      return await this.prisma.property.create({
        data: {
          key: dto.key,
          label: dto.label,
          description: dto.description,
        },
        include: PROPERTY_INCLUDE,
      });
    } catch (error) {
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.property.findMany({
      include: PROPERTY_INCLUDE,
      orderBy: {
        label: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: PROPERTY_INCLUDE,
    });

    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    return property;
  }

  async update(id: string, dto: UpdatePropertyDto) {
    try {
      return await this.prisma.property.update({
        where: { id },
        data: {
          key: dto.key,
          label: dto.label,
          description: dto.description,
        },
        include: PROPERTY_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Property with id "${id}" not found`);
      }
      this.throwKnownPrismaError(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.property.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Property with id "${id}" not found`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Property is still referenced by condition weights or recipe scores and cannot be deleted.',
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
      throw new BadRequestException('Property key must be unique.');
    }
  }
}
