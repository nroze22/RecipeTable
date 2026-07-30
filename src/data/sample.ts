import type { Recipe } from "../types";

export const SAMPLE_RECIPE: Recipe = {
  id: "espresso-brownies",
  title: "Espresso Brownies",
  description: "Deep chocolate brownies with a quiet coffee edge.",
  yield: "One 8 × 8-inch pan",
  prepTime: "15 minutes",
  cookTime: "30–40 minutes",
  ingredients: [
    {
      id: "butter",
      raw: "4 oz (115 g) unsalted butter",
      quantity: "4 oz (115 g)",
      name: "unsalted butter"
    },
    {
      id: "sugar",
      raw: "1 cup (200 g) granulated sugar",
      quantity: "1 cup (200 g)",
      name: "granulated sugar"
    },
    {
      id: "vanilla",
      raw: "1 tsp vanilla extract",
      quantity: "1 tsp",
      name: "vanilla extract"
    },
    {
      id: "espresso",
      raw: "¼ cup freshly brewed espresso",
      quantity: "¼ cup",
      name: "freshly brewed espresso"
    },
    {
      id: "eggs",
      raw: "2 large eggs",
      quantity: "2",
      name: "large eggs"
    },
    {
      id: "flour",
      raw: "½ cup (80 g) all-purpose flour",
      quantity: "½ cup (80 g)",
      name: "all-purpose flour"
    },
    {
      id: "cocoa",
      raw: "⅓ cup (30 g) cocoa powder",
      quantity: "⅓ cup (30 g)",
      name: "cocoa powder"
    },
    {
      id: "baking-soda",
      raw: "¼ tsp baking soda",
      quantity: "¼ tsp",
      name: "baking soda"
    },
    {
      id: "salt",
      raw: "¼ tsp fine salt",
      quantity: "¼ tsp",
      name: "fine salt"
    }
  ],
  steps: [
    {
      id: "setup-pan",
      order: 0,
      raw: "Butter and flour an 8 × 8-inch pan.",
      isSetup: true
    },
    {
      id: "setup-oven",
      order: 1,
      raw: "Preheat the oven to 350°F (175°C).",
      isSetup: true
    },
    {
      id: "melt-butter",
      order: 2,
      raw: "Melt the butter in a medium mixing bowl."
    },
    {
      id: "mix-wet",
      order: 3,
      raw: "Whisk the sugar, vanilla, and espresso into the melted butter."
    },
    {
      id: "add-eggs",
      order: 4,
      raw: "Beat in the eggs until glossy, about 1 minute."
    },
    {
      id: "fold-dry",
      order: 5,
      raw: "Fold in the flour, cocoa powder, baking soda, and salt just until combined."
    },
    {
      id: "bake",
      order: 6,
      raw: "Bake at 350°F (175°C) for 30 to 40 minutes."
    }
  ],
  source: {
    siteName: "RecipeTable sample"
  },
  importedAt: "2026-07-30T00:00:00.000Z"
};

