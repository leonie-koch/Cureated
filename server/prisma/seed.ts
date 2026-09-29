import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type SeedIngredient = { blsFoodCode: string; amount: number; unit: string };

const recipes: {
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  instructions: string;
  ingredients: SeedIngredient[];
}[] = [
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

// Mirrors RecipesService.resolveIngredientIdByBlsFoodCode: matches an
// existing Ingredient by blsFoodCode first, then retroactively by name
// (in case it was added as free text before this seed ran), and only
// creates a new row as a last resort — so re-running against a database
// that already has some of these ingredients doesn't create duplicates.
async function resolveIngredientId(blsFoodCode: string): Promise<string> {
  const alreadyMatched = await prisma.ingredient.findFirst({
    where: { blsFoodCode },
    select: { id: true },
  });
  if (alreadyMatched) {
    return alreadyMatched.id;
  }

  const blsFood = await prisma.blsFood.findUniqueOrThrow({
    where: { blsCode: blsFoodCode },
    select: { nameDe: true },
  });

  const existingByName = await prisma.ingredient.findFirst({
    where: { name: { equals: blsFood.nameDe, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existingByName) {
    const updated = await prisma.ingredient.update({
      where: { id: existingByName.id },
      data: { blsFoodCode },
      select: { id: true },
    });
    return updated.id;
  }

  const created = await prisma.ingredient.create({
    data: { name: blsFood.nameDe, blsFoodCode },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  const existingCount = await prisma.recipe.count();
  if (existingCount > 0) {
    console.log(
      `Skipping seed: ${existingCount} recipe(s) already exist in the database.`,
    );
    return;
  }

  for (const { ingredients, ...recipeFields } of recipes) {
    const recipe = await prisma.recipe.create({ data: recipeFields });

    await prisma.recipeIngredient.createMany({
      data: await Promise.all(
        ingredients.map(async (ingredient) => ({
          recipeId: recipe.id,
          ingredientId: await resolveIngredientId(ingredient.blsFoodCode),
          amount: ingredient.amount,
          unit: ingredient.unit,
        })),
      ),
    });
  }

  console.log(`Seeded ${recipes.length} recipes with ingredients.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
