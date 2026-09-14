import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecipeIngredientsField } from "@/components/recipe-ingredients-field";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

function numberOrUndefined(value: FormDataEntryValue | null) {
  if (!value || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

type IngredientRow = { name?: string; amount?: string; unit?: string };

function parseIngredients(formData: FormData) {
  const rows = new Map<string, IngredientRow>();

  for (const [key, value] of formData.entries()) {
    const match = /^ingredients\.(.+)\.(name|amount|unit)$/.exec(key);
    if (!match) continue;
    const [, rowKey, field] = match;
    const row = rows.get(rowKey) ?? {};
    row[field as keyof IngredientRow] = String(value);
    rows.set(rowKey, row);
  }

  return Array.from(rows.values())
    .filter((row) => row.name?.trim())
    .map((row) => ({
      name: row.name!.trim(),
      amount: Number(row.amount),
      unit: row.unit ?? "g",
    }))
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
}

async function createRecipe(formData: FormData) {
  "use server";

  const ingredients = parseIngredients(formData);

  const payload = {
    title: String(formData.get("title") ?? ""),
    description: (formData.get("description") as string) || undefined,
    servings: numberOrUndefined(formData.get("servings")),
    prepMinutes: numberOrUndefined(formData.get("prepMinutes")),
    cookMinutes: numberOrUndefined(formData.get("cookMinutes")),
    instructions: (formData.get("instructions") as string) || undefined,
    ingredients: ingredients.length ? ingredients : undefined,
  };

  const res = await fetch(`${API_URL}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create recipe: ${res.status}`);
  }

  redirect("/");
}

export default function NewRecipePage() {
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
            Add recipe
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recipe details</CardTitle>
            <CardDescription>
              Ingredients can be added later — start with the basics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createRecipe} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="servings">Servings</Label>
                  <Input id="servings" name="servings" type="number" min={1} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prepMinutes">Prep (min)</Label>
                  <Input
                    id="prepMinutes"
                    name="prepMinutes"
                    type="number"
                    min={0}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cookMinutes">Cook (min)</Label>
                  <Input
                    id="cookMinutes"
                    name="cookMinutes"
                    type="number"
                    min={0}
                  />
                </div>
              </div>

              <RecipeIngredientsField />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" name="instructions" rows={5} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link
                  href="/"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Cancel
                </Link>
                <Button type="submit">Save recipe</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
