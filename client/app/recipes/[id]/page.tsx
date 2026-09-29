import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_URL } from "@/lib/api";
import { PropertyScore, qualifyingPropertyScores } from "@/lib/property-scores";

type RecipeDetail = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  instructions: string | null;
  recipeIngredients: {
    id: string;
    amount: number;
    unit: string;
    ingredient: {
      id: string;
      name: string;
    };
  }[];
  propertyScores: PropertyScore[];
};

type Micronutrient = {
  code: string;
  nameDe: string;
  nameEn: string | null;
  unit: string;
  group: string;
  amount: number | null;
};

async function getRecipe(id: string): Promise<RecipeDetail | null> {
  const res = await fetch(`${API_URL}/recipes/${id}`, { cache: "no-store" });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to load recipe: ${res.status}`);
  }

  return res.json();
}

async function getMicronutrients(id: string): Promise<Micronutrient[]> {
  const res = await fetch(`${API_URL}/recipes/${id}/micronutrients`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load micronutrients: ${res.status}`);
  }

  return res.json();
}

// Preserves the backend's group order (fat-soluble vitamins, water-soluble
// vitamins, elements) instead of re-sorting, since Map iteration order
// follows insertion order.
function groupMicronutrients(
  micronutrients: Micronutrient[],
): { group: string; items: Micronutrient[] }[] {
  const byGroup = new Map<string, Micronutrient[]>();
  for (const nutrient of micronutrients) {
    const items = byGroup.get(nutrient.group) ?? [];
    items.push(nutrient);
    byGroup.set(nutrient.group, items);
  }
  return Array.from(byGroup, ([group, items]) => ({ group, items }));
}

function totalMinutes(recipe: RecipeDetail): number | null {
  if (recipe.prepMinutes == null && recipe.cookMinutes == null) {
    return null;
  }
  return (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let recipe: RecipeDetail | null = null;
  let micronutrients: Micronutrient[] = [];
  let loadError: string | null = null;

  try {
    recipe = await getRecipe(id);
    if (recipe) {
      micronutrients = await getMicronutrients(id);
    }
  } catch {
    loadError =
      "Couldn't reach the API. Make sure the server is running on " +
      API_URL;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 sm:px-12">
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to homefeed
          </Link>
          <p className="text-sm text-destructive">{loadError}</p>
        </main>
      </div>
    );
  }

  if (!recipe) {
    notFound();
  }

  const qualifyingScores = qualifyingPropertyScores(recipe.propertyScores);

  return (
    <div className="min-h-screen bg-background px-6 py-12 sm:px-12">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to homefeed
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-2 text-muted-foreground">
              {recipe.description}
            </p>
          )}
          {(recipe.servings != null || totalMinutes(recipe) != null) && (
            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              {recipe.servings != null && (
                <span>{recipe.servings} servings</span>
              )}
              {totalMinutes(recipe) != null && (
                <span>{totalMinutes(recipe)} min</span>
              )}
            </div>
          )}
        </div>

        {qualifyingScores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {qualifyingScores.map((propertyScore) => (
              <span
                key={propertyScore.id}
                title={propertyScore.property.description ?? undefined}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {propertyScore.property.label}
              </span>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
            {recipe.recipeIngredients.length === 0 && (
              <CardDescription>No ingredients added yet.</CardDescription>
            )}
          </CardHeader>
          {recipe.recipeIngredients.length > 0 && (
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {recipe.recipeIngredients.map((recipeIngredient) => (
                  <li key={recipeIngredient.id} className="flex gap-2">
                    <span className="text-muted-foreground">
                      {recipeIngredient.amount} {recipeIngredient.unit}
                    </span>
                    <span>{recipeIngredient.ingredient.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            {!recipe.instructions && (
              <CardDescription>No instructions added yet.</CardDescription>
            )}
          </CardHeader>
          {recipe.instructions && (
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {recipe.instructions}
              </p>
            </CardContent>
          )}
        </Card>

        {micronutrients.length > 0 && (
          <details className="group rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10">
            <summary className="flex cursor-pointer list-none items-center justify-between font-heading text-base font-medium marker:hidden">
              Micronutrients
              <span className="text-muted-foreground transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <p className="mt-1 text-xs text-muted-foreground">
              Total amounts for this recipe, not per serving. Ingredients not
              matched to a BLS food don&apos;t contribute any data.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {groupMicronutrients(micronutrients).map(({ group, items }) => (
                <div key={group}>
                  <h3 className="mb-2 text-sm font-medium text-foreground">
                    {group}
                  </h3>
                  <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                    {items.map((nutrient) => (
                      <li
                        key={nutrient.code}
                        className="flex justify-between gap-2"
                      >
                        <span className="text-muted-foreground">
                          {nutrient.nameDe}
                        </span>
                        <span>
                          {nutrient.amount != null
                            ? `${nutrient.amount} ${nutrient.unit}`
                            : "–"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
