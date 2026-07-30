export interface RecipeIngredient {
  id: string;
  raw: string;
  quantity?: string;
  unit?: string;
  name: string;
  preparation?: string;
  optional?: boolean;
}

export interface RecipeStep {
  id: string;
  order: number;
  raw: string;
  isSetup?: boolean;
}

export interface RecipeSource {
  url?: string;
  siteName?: string;
  author?: string;
  image?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  source?: RecipeSource;
  importedAt: string;
}

export interface IngredientStepLink {
  stepIndex: number;
  ingredientIndexes: number[];
  shortLabel?: string;
  confidence?: number;
}

export interface CompiledAction {
  id: string;
  stepIndex: number;
  order: number;
  label: string;
  instruction: string;
  ingredientIds: string[];
  ingredientRowStart: number;
  ingredientRowEnd: number;
  duration?: string;
  durationSeconds?: number;
  temperature?: string;
  confidence: number;
}

export interface CompiledRecipe {
  recipe: Recipe;
  orderedIngredients: RecipeIngredient[];
  setupSteps: RecipeStep[];
  actions: CompiledAction[];
  warnings: string[];
  confidence: number;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

