import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const recipes = [
  {
    title: 'Lemon Garlic Roasted Salmon',
    description: 'Flaky salmon fillets roasted with lemon, garlic and herbs.',
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 15,
    instructions:
      'Season salmon with salt, pepper, lemon juice and minced garlic. Roast at 200°C for 15 minutes.',
  },
  {
    title: 'Creamy Mushroom Risotto',
    description: 'Slow-cooked arborio rice with mushrooms and parmesan.',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    instructions:
      'Sauté mushrooms, toast rice, add stock gradually while stirring until creamy. Finish with parmesan.',
  },
  {
    title: 'Spiced Chickpea Curry',
    description: 'A warming chickpea and tomato curry with coconut milk.',
    servings: 3,
    prepMinutes: 10,
    cookMinutes: 25,
    instructions:
      'Sauté onions and spices, add chickpeas, tomatoes and coconut milk. Simmer for 25 minutes.',
  },
  {
    title: 'Berry Overnight Oats',
    description: 'No-cook oats soaked overnight with mixed berries and yogurt.',
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    instructions:
      'Combine oats, yogurt and milk in a jar, top with berries, refrigerate overnight.',
  },
];

async function main() {
  const existingCount = await prisma.recipe.count();
  if (existingCount > 0) {
    console.log(
      `Skipping seed: ${existingCount} recipe(s) already exist in the database.`,
    );
    return;
  }

  await prisma.recipe.createMany({ data: recipes });
  console.log(`Seeded ${recipes.length} recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
