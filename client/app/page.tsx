const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black sm:px-12">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Homefeed
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Recipes picked for you.
          </p>
        </div>

        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        )}

        {!loadError && recipes.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No recipes yet.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">{recipe.title}</h2>
                {recipe.description && <p>{recipe.description}</p>}
                <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {recipe.servings != null && (
                    <span>{recipe.servings} servings</span>
                  )}
                  {totalMinutes(recipe) != null && (
                    <span>{totalMinutes(recipe)} min</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
