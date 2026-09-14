import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
};

async function getRecipes(): Promise<Recipe[]> {
  const res = await fetch(`${API_URL}/recipes`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to load recipes: ${res.status}`);
  }

  return res.json();
}

function totalMinutes(recipe: Recipe): number | null {
  if (recipe.prepMinutes == null && recipe.cookMinutes == null) {
    return null;
  }
  return (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
}

export default async function Home() {
  let recipes: Recipe[] = [];
  let loadError: string | null = null;

  try {
    recipes = await getRecipes();
  } catch {
    loadError =
      "Couldn't reach the API. Make sure the server is running on " +
      API_URL;
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 sm:px-12">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Homefeed
            </h1>
            <p className="mt-2 text-muted-foreground">
              Recipes picked for you.
            </p>
          </div>
          <Button>Add recipe</Button>
        </div>

        {loadError && (
          <p className="text-sm text-destructive">{loadError}</p>
        )}

        {!loadError && recipes.length === 0 && (
          <p className="text-sm text-muted-foreground">No recipes yet.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <Card key={recipe.id}>
              <CardHeader>
                <CardTitle>{recipe.title}</CardTitle>
                {recipe.description && (
                  <CardDescription>{recipe.description}</CardDescription>
                )}
              </CardHeader>
              {(recipe.servings != null || totalMinutes(recipe) != null) && (
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {recipe.servings != null && (
                      <span>{recipe.servings} servings</span>
                    )}
                    {totalMinutes(recipe) != null && (
                      <span>{totalMinutes(recipe)} min</span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
