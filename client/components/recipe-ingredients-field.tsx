"use client";

import { useState } from "react";
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

export function RecipeIngredientsField() {
  const [rowKeys, setRowKeys] = useState<string[]>([crypto.randomUUID()]);

  return (
    <div className="flex flex-col gap-3">
      <Label>Ingredients</Label>

      {rowKeys.map((key) => (
        <div key={key} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`ingredient-name-${key}`} className="sr-only">
              Ingredient
            </Label>
            <Input
              id={`ingredient-name-${key}`}
              name={`ingredients.${key}.name`}
              placeholder="e.g. Salmon fillet"
            />
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
