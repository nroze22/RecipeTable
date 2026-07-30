import { describe, expect, it } from "vitest";
import {
  looksLikeIngredient,
  parseIngredientLine,
  parseRecipeText
} from "./parseRecipeText";

describe("parseIngredientLine", () => {
  it("keeps dual measurements and preparation details", () => {
    const ingredient = parseIngredientLine(
      "4 oz (115 g) unsalted butter, softened"
    );
    expect(ingredient.quantity).toBe("4 oz (115 g)");
    expect(ingredient.name).toBe("unsalted butter");
    expect(ingredient.preparation).toBe("softened");
  });

  it("recognizes common ingredient starts", () => {
    expect(looksLikeIngredient("½ cup cocoa powder")).toBe(true);
    expect(looksLikeIngredient("2 large eggs")).toBe(true);
    expect(looksLikeIngredient("Bake until the center is set.")).toBe(false);
  });
});

describe("parseRecipeText", () => {
  it("parses explicit recipe sections and metadata", () => {
    const recipe = parseRecipeText(`
Lemon Cake
Serves: 8

Ingredients
2 cups flour
1 cup sugar
2 large eggs
1 lemon, zested

Directions
1. Preheat oven to 350°F.
2. Whisk the flour and sugar.
3. Beat in the eggs and lemon.
4. Bake for 30 minutes.
`);

    expect(recipe.title).toBe("Lemon Cake");
    expect(recipe.yield).toBe("8");
    expect(recipe.ingredients).toHaveLength(4);
    expect(recipe.steps).toHaveLength(4);
    expect(recipe.steps[0].isSetup).toBe(true);
    expect(recipe.steps[3].raw).toBe("Bake for 30 minutes.");
  });

  it("infers an OCR-style ingredient block without headings", () => {
    const recipe = parseRecipeText(`
Quick Biscuits
2 cups all-purpose flour
1 tbsp baking powder
1 tsp salt
1 cup milk
Mix the dry ingredients.
Stir in the milk.
Bake for 12 minutes.
`);

    expect(recipe.title).toBe("Quick Biscuits");
    expect(recipe.ingredients.map((item) => item.name)).toEqual([
      "all-purpose flour",
      "baking powder",
      "salt",
      "milk"
    ]);
    expect(recipe.steps).toHaveLength(3);
  });
});
