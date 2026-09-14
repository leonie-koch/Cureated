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

  await request.delete(`${API_URL}/recipes/${created.id}`);
});
