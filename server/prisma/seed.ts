import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PropertiesService } from '../src/properties/properties.service.js';
import {
  ATOMIC_PROPERTY_DEFINITIONS,
  PROTEIN_RICH_PROPERTY,
} from '../src/recipes/atomic-properties.js';
import { CreateRecipeDto } from '../src/recipes/dto/create-recipe.dto.js';
import { RecipesService } from '../src/recipes/recipes.service.js';

// Atomic properties only — directly data-based, 1:1 with a measurable
// value, no disease-specific claim attached (see README "Core features").
// Composite properties (e.g. "Mitochondrial support") and condition
// weighting build on these but rest on much more contested science for
// the prototype's initial condition (ME/CFS); left unseeded for now so the
// app doesn't surface them until that's been thought through further.
// Derived from the single source of truth in atomic-properties.ts, rather
// than duplicating key/label/description here, so scoring and the seeded
// catalog can't drift apart.
const ATOMIC_PROPERTIES = [
  ...ATOMIC_PROPERTY_DEFINITIONS.map(({ key, label, description }) => ({
    key,
    label,
    description,
  })),
  {
    key: PROTEIN_RICH_PROPERTY.key,
    label: PROTEIN_RICH_PROPERTY.label,
    description: PROTEIN_RICH_PROPERTY.description,
  },
];

const RECIPES: CreateRecipeDto[] = [
  {
    title: 'Lemon Garlic Roasted Salmon',
    description: 'Flaky salmon fillets roasted with lemon, garlic and herbs.',
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 15,
    instructions:
      'Season salmon with salt, pepper, lemon juice and minced garlic. Roast at 200°C for 15 minutes.',
    ingredients: [
      { blsFoodCode: 'T410100', amount: 300, unit: 'g' }, // Lachs, roh
      { blsFoodCode: 'G490100', amount: 10, unit: 'g' }, // Knoblauch, roh
      { blsFoodCode: 'F601100', amount: 60, unit: 'g' }, // Zitrone, roh
    ],
  },
  {
    title: 'Creamy Mushroom Risotto',
    description: 'Slow-cooked arborio rice with mushrooms and parmesan.',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    instructions:
      'Sauté mushrooms, toast rice, add stock gradually while stirring until creamy. Finish with parmesan.',
    ingredients: [
      { blsFoodCode: 'C352000', amount: 300, unit: 'g' }, // Reis, poliert, roh
      { blsFoodCode: 'K701100', amount: 250, unit: 'g' }, // Champignon, roh
      { blsFoodCode: 'M306400', amount: 50, unit: 'g' }, // Parmesan mind. 30 % Fett i. Tr.
    ],
  },
  {
    title: 'Spiced Chickpea Curry',
    description: 'A warming chickpea and tomato curry with coconut milk.',
    servings: 3,
    prepMinutes: 10,
    cookMinutes: 25,
    instructions:
      'Sauté onions and spices, add chickpeas, tomatoes and coconut milk. Simmer for 25 minutes.',
    ingredients: [
      { blsFoodCode: 'H720902', amount: 400, unit: 'g' }, // Kichererbse reif, Konserve, abgetropft
      { blsFoodCode: 'G561100', amount: 300, unit: 'g' }, // Tomate, roh
      { blsFoodCode: 'H154000', amount: 200, unit: 'ml' }, // Kokosmilch/Kokosnussmilch
      { blsFoodCode: 'G480100', amount: 100, unit: 'g' }, // Speisezwiebel, roh
    ],
  },
  {
    title: 'Berry Overnight Oats',
    description: 'No-cook oats soaked overnight with mixed berries and yogurt.',
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    instructions:
      'Combine oats, yogurt and milk in a jar, top with berries, refrigerate overnight.',
    ingredients: [
      { blsFoodCode: 'C133000', amount: 50, unit: 'g' }, // Hafer Flocken
      { blsFoodCode: 'M141100', amount: 150, unit: 'g' }, // Joghurt aus entrahmter Milch, max. 0,5 % Fett
      { blsFoodCode: 'M111300', amount: 100, unit: 'ml' }, // Vollmilch frisch, 3,5 % Fett, pasteurisiert
      { blsFoodCode: 'F304100', amount: 80, unit: 'g' }, // Heidelbeere, roh
    ],
  },
];

async function seedProperties(
  prisma: PrismaService,
  propertiesService: PropertiesService,
) {
  let created = 0;
  for (const property of ATOMIC_PROPERTIES) {
    const existing = await prisma.property.findUnique({
      where: { key: property.key },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
    await propertiesService.create(property);
    created++;
  }
  console.log(
    created > 0
      ? `Seeded ${created} propert${created === 1 ? 'y' : 'ies'}.`
      : 'Skipping property seed: all atomic properties already exist.',
  );
}

// Goes through RecipesService.create (rather than a plain Prisma insert)
// so seeded recipes get the same ingredient resolution and property score
// computation any recipe created through the API gets — this only pays off
// if properties already exist when a recipe is created, hence seeding
// those first.
async function seedRecipes(
  prisma: PrismaService,
  recipesService: RecipesService,
) {
  const existingCount = await prisma.recipe.count();
  if (existingCount > 0) {
    console.log(
      `Skipping recipe seed: ${existingCount} recipe(s) already exist in the database.`,
    );
    return;
  }

  for (const recipe of RECIPES) {
    await recipesService.create(recipe);
  }
  console.log(`Seeded ${RECIPES.length} recipes with ingredients.`);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const prisma = app.get(PrismaService);
    await seedProperties(prisma, app.get(PropertiesService));
    await seedRecipes(prisma, app.get(RecipesService));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
