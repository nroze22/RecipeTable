import type { Recipe } from "../types";

const STORAGE_KEY = "recipe-table:recent";
const MAX_RECENT = 8;

export function loadRecentRecipes(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecipe).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function saveRecentRecipe(recipe: Recipe): void {
  if (typeof window === "undefined") return;
  const next = [
    recipe,
    ...loadRecentRecipes().filter(
      (candidate) =>
        candidate.id !== recipe.id &&
        candidate.source?.url !== recipe.source?.url
    )
  ].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Recipe>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.ingredients) &&
    Array.isArray(candidate.steps)
  );
}

