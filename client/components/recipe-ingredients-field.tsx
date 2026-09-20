"use client";

import { useEffect, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const INGREDIENT_UNITS = [
  "g",
  "kg",
  "mg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "oz",
  "lb",
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type BlsFoodOption = {
  blsCode: string;
  nameDe: string;
  nameEn: string | null;
  foodGroup: string | null;
};

function useBlsFoods() {
  const [foods, setFoods] = useState<BlsFoodOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/bls-foods`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load foods: ${res.status}`);
        return res.json() as Promise<BlsFoodOption[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setFoods(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { foods, status };
}

function IngredientCombobox({
  rowKey,
  foods,
  status,
}: {
  rowKey: string;
  foods: BlsFoodOption[];
  status: "loading" | "ready" | "error";
}) {
  // Selection-only: the ingredient added is whichever BLS food the user
  // picked from the dropdown. The typed query text never becomes the
  // ingredient by itself — only a selected item sets `value`, which is
  // what actually gets submitted (as blsFoodCode) via the `name` prop.
  const [value, setValue] = useState<BlsFoodOption | null>(null);

  return (
    <Combobox.Root
      items={foods}
      value={value}
      onValueChange={setValue}
      itemToStringLabel={(food) => food.nameDe}
      itemToStringValue={(food) => food.blsCode}
      isItemEqualToValue={(a, b) => a.blsCode === b.blsCode}
      name={`ingredients.${rowKey}.blsFoodCode`}
      limit={50}
    >
      <Combobox.Input
        id={`ingredient-name-${rowKey}`}
        placeholder={
          status === "loading"
            ? "Loading ingredients…"
            : status === "error"
              ? "Couldn't load ingredients"
              : "Search ingredient…"
        }
        disabled={status !== "ready"}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        )}
      />
      <Combobox.Portal>
        <Combobox.Positioner className="outline-none" sideOffset={4}>
          <Combobox.Popup className="max-h-72 w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.Empty className="px-2.5 py-2 text-sm text-muted-foreground">
              No matching ingredient.
            </Combobox.Empty>
            <Combobox.List>
              {(food: BlsFoodOption) => (
                <Combobox.Item
                  key={food.blsCode}
                  value={food}
                  className="flex cursor-default flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span>{food.nameDe}</span>
                  {food.foodGroup && (
                    <span className="text-xs text-muted-foreground">
                      {food.foodGroup}
                    </span>
                  )}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export function RecipeIngredientsField() {
  // A stable key for the first row so server- and client-rendered HTML
  // match on initial load; crypto.randomUUID() is fine for rows added
  // afterwards since that only ever happens client-side, in response to
  // the "+ Add ingredient" click.
  const [rowKeys, setRowKeys] = useState<string[]>(["initial"]);
  const { foods, status } = useBlsFoods();

  return (
    <div className="flex flex-col gap-3">
      <Label>Ingredients</Label>

      {rowKeys.map((key) => (
        <div key={key} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`ingredient-name-${key}`} className="sr-only">
              Ingredient
            </Label>
            <IngredientCombobox rowKey={key} foods={foods} status={status} />
          </div>

          <div className="flex w-24 flex-col gap-1.5">
            <Label htmlFor={`ingredient-amount-${key}`} className="sr-only">
              Amount
            </Label>
            <Input
              id={`ingredient-amount-${key}`}
              name={`ingredients.${key}.amount`}
              type="number"
              min={0}
              step="any"
              placeholder="Amount"
            />
          </div>

          <Select name={`ingredients.${key}.unit`} defaultValue="g">
            <SelectTrigger aria-label="Unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INGREDIENT_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove ingredient"
            onClick={() =>
              setRowKeys((keys) => keys.filter((k) => k !== key))
            }
          >
            ✕
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setRowKeys((keys) => [...keys, crypto.randomUUID()])}
      >
        + Add ingredient
      </Button>
    </div>
  );
}
