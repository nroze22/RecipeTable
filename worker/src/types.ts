export interface ExtractedRecipe {
  title: string;
  description?: string;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  ingredients: string[];
  instructions: string[];
  source: {
    url: string;
    siteName?: string;
    author?: string;
    image?: string;
  };
}

export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface Env {
  AI?: AiBinding;
  AI_MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface CompileRequest {
  title: string;
  ingredients: string[];
  steps: string[];
  setupStepIndexes?: number[];
}

export interface IngredientStepLink {
  stepIndex: number;
  ingredientIndexes: number[];
  shortLabel?: string;
  confidence?: number;
}

