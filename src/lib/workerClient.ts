import { recipeFromParts } from "./parseRecipeText";
import type { IngredientStepLink, Recipe } from "../types";

interface ExtractedRecipePayload {
  recipe: {
    title: string;
    description?: string;
    yield?: string;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    ingredients: string[];
    instructions: string[];
    source?: {
      url?: string;
      siteName?: string;
      author?: string;
      image?: string;
    };
  };
  cached?: boolean;
}

interface ApiError {
  error?: {
    message?: string;
    code?: string;
  };
}

function workerUrl(path: string): string {
  const base = import.meta.env.VITE_RECIPE_WORKER_URL?.replace(/\/+$/, "");
  if (!base) {
    throw new Error(
      "URL importing is not connected yet. Paste the recipe text or configure VITE_RECIPE_WORKER_URL."
    );
  }
  return `${base}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    throw new Error(
      body.error?.message || `The recipe service returned ${response.status}.`
    );
  }
  return body;
}

export async function extractRecipeUrl(url: string): Promise<Recipe> {
  const response = await fetch(workerUrl("/extract"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url })
  });
  const payload = await parseResponse<ExtractedRecipePayload>(response);
  const extracted = payload.recipe;
  return recipeFromParts({
    title: extracted.title,
    description: extracted.description,
    ingredientLines: extracted.ingredients,
    instructionLines: extracted.instructions,
    source: extracted.source,
    yield: extracted.yield,
    prepTime: extracted.prepTime,
    cookTime: extracted.cookTime,
    totalTime: extracted.totalTime
  });
}

export async function refineRecipeLinks(
  recipe: Recipe
): Promise<IngredientStepLink[]> {
  const response = await fetch(workerUrl("/compile"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: recipe.title,
      ingredients: recipe.ingredients.map((ingredient) => ingredient.raw),
      steps: recipe.steps.map((step) => step.raw),
      setupStepIndexes: recipe.steps
        .map((step, index) => (step.isSetup ? index : -1))
        .filter((index) => index >= 0)
    })
  });
  const payload = await parseResponse<{ links: IngredientStepLink[] }>(response);
  return payload.links;
}

export function isWorkerConfigured(): boolean {
  return Boolean(import.meta.env.VITE_RECIPE_WORKER_URL);
}

