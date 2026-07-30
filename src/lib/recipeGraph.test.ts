import { describe, expect, it } from "vitest";
import { SAMPLE_RECIPE } from "../data/sample";
import { compileRecipe, recipeToTsv } from "./recipeGraph";

describe("compileRecipe", () => {
  it("orders ingredients by first use and carries the mixture into baking", () => {
    const compiled = compileRecipe(SAMPLE_RECIPE);
    expect(compiled.setupSteps).toHaveLength(2);
    expect(compiled.actions.map((action) => action.label)).toEqual([
      "Melt",
      "Whisk",
      "Beat",
      "Fold",
      "Bake"
    ]);
    expect(compiled.orderedIngredients[0].id).toBe("butter");
    const bake = compiled.actions.at(-1)!;
    expect(bake.ingredientRowStart).toBe(0);
    expect(bake.ingredientRowEnd).toBe(
      compiled.orderedIngredients.length - 1
    );
    expect(bake.duration).toBe("30–40 minutes");
    expect(bake.temperature).toContain("350°F");
  });

  it("accepts a validated external link plan", () => {
    const compiled = compileRecipe(SAMPLE_RECIPE, [
      {
        stepIndex: 2,
        ingredientIndexes: [0],
        shortLabel: "Gently melt",
        confidence: 0.98
      }
    ]);
    expect(compiled.actions[0].label).toBe("Gently melt");
    expect(compiled.actions[0].ingredientIds).toEqual(["butter"]);
  });

  it("produces a Sheets-friendly table", () => {
    const tsv = recipeToTsv(compileRecipe(SAMPLE_RECIPE));
    expect(tsv).toContain("Ingredient\tMelt\tWhisk");
    expect(tsv).toContain("unsalted butter");
  });
});

