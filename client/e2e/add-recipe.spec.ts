import { test, expect } from "@playwright/test";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

test("adds a recipe via the create-recipe form and shows it in the homefeed", async ({
  page,
  request,
}) => {
  const title = `E2E Test Recipe ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("link", { name: "Add recipe" }).click();
  await expect(page).toHaveURL("/recipes/new");

  await page.getByLabel("Title").fill(title);
  await page
    .getByLabel("Description")
    .fill("Created by the Playwright e2e test.");
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Prep (min)").fill("5");
  await page.getByLabel("Cook (min)").fill("10");
  await page.getByLabel("Instructions").fill("Mix everything and serve.");

  const ingredientInputs = page.getByLabel("Ingredient", { exact: true });
  const amountInputs = page.getByPlaceholder("Amount");

  // Ingredients can only be added by picking a result from the dropdown —
  // typing alone never adds one, matching real BLS food names.
  await ingredientInputs.nth(0).fill("Tomate roh");
  await page.getByRole("option", { name: "Tomate roh" }).click();
  await amountInputs.nth(0).fill("200");

  // Second ingredient row, switch the unit away from the default.
  await page.getByRole("button", { name: "+ Add ingredient" }).click();
  await ingredientInputs.nth(1).fill("Hühnerei roh");
  await page.getByRole("option", { name: "Hühnerei roh" }).click();
  await amountInputs.nth(1).fill("1");
  await page.getByRole("combobox", { name: "Unit" }).nth(1).click();
  await page.getByRole("option", { name: "cup" }).click();

  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(title)).toBeVisible();

  const recipes = await request
    .get(`${API_URL}/recipes`)
    .then((res) => res.json());
  const created = recipes.find((recipe: { title: string }) =>
    recipe.title === title
  );
  expect(created).toBeTruthy();

  const ingredientNames = created.recipeIngredients.map(
    (ri: { ingredient: { name: string } }) => ri.ingredient.name,
  );
  expect(ingredientNames).toEqual(
    expect.arrayContaining(["Tomate roh", "Hühnerei roh"]),
  );
  const egg = created.recipeIngredients.find(
    (ri: { ingredient: { name: string } }) =>
      ri.ingredient.name === "Hühnerei roh",
  );
  expect(egg.unit).toBe("cup");
  expect(egg.amount).toBe(1);
  expect(egg.ingredient.blsFoodCode).toBe("E111100");

  const tomato = created.recipeIngredients.find(
    (ri: { ingredient: { name: string } }) =>
      ri.ingredient.name === "Tomate roh",
  );
  expect(tomato.ingredient.blsFoodCode).toBe("G561100");

  await request.delete(`${API_URL}/recipes/${created.id}`);
});
