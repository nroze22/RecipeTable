import type {
  CompiledAction,
  CompiledRecipe,
  IngredientStepLink,
  Recipe,
  RecipeIngredient
} from "../types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "of",
  "or",
  "the",
  "fresh",
  "freshly",
  "fine",
  "finely",
  "large",
  "medium",
  "small",
  "ground",
  "chopped",
  "diced",
  "minced",
  "sliced",
  "unsalted",
  "salted",
  "granulated",
  "packed"
]);

const DRY_WORDS = new Set([
  "flour",
  "sugar",
  "cocoa",
  "soda",
  "powder",
  "salt",
  "spice",
  "cinnamon",
  "starch",
  "cornmeal",
  "oats"
]);

const WET_WORDS = new Set([
  "egg",
  "eggs",
  "milk",
  "cream",
  "water",
  "oil",
  "butter",
  "vanilla",
  "juice",
  "espresso",
  "coffee",
  "yogurt"
]);

const GENERIC_INGREDIENT_TAILS = new Set([
  "cheese",
  "extract",
  "juice",
  "oil",
  "paste",
  "powder",
  "sauce",
  "stock"
]);

const ACTION_VERBS = [
  "preheat",
  "prepare",
  "grease",
  "line",
  "melt",
  "whisk",
  "mix",
  "stir",
  "beat",
  "cream",
  "fold",
  "combine",
  "add",
  "pour",
  "transfer",
  "shape",
  "chill",
  "rest",
  "marinate",
  "simmer",
  "boil",
  "cook",
  "bake",
  "roast",
  "broil",
  "grill",
  "fry",
  "sauté",
  "saute",
  "serve",
  "finish"
];

function normalizedWords(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function aliasesForIngredient(ingredient: RecipeIngredient): string[][] {
  const words = normalizedWords(ingredient.name);
  const meaningful = words.filter((word) => !STOP_WORDS.has(word));
  const aliases: string[][] = [];
  if (meaningful.length) aliases.push(meaningful);
  if (meaningful.length > 1) aliases.push(meaningful.slice(-2));
  const last = meaningful.at(-1);
  if (last && last.length > 2 && !GENERIC_INGREDIENT_TAILS.has(last)) {
    aliases.push([last]);
  }
  if (
    meaningful.length > 1 &&
    last &&
    GENERIC_INGREDIENT_TAILS.has(last) &&
    meaningful[0].length > 2
  ) {
    aliases.push([meaningful[0]]);
  }
  return aliases;
}

function containsAlias(stepWords: Set<string>, alias: string[]): boolean {
  return alias.every((word) => {
    if (stepWords.has(word)) return true;
    if (word.endsWith("s") && stepWords.has(word.slice(0, -1))) return true;
    return stepWords.has(`${word}s`);
  });
}

function classifyIngredient(
  ingredient: RecipeIngredient,
  group: "dry" | "wet"
): boolean {
  const words = normalizedWords(ingredient.name);
  const vocabulary = group === "dry" ? DRY_WORDS : WET_WORDS;
  return words.some((word) => vocabulary.has(word));
}

function inferIngredientIds(
  instruction: string,
  ingredients: RecipeIngredient[]
): { ids: string[]; confidence: number } {
  const words = new Set(normalizedWords(instruction));
  const ids = ingredients
    .filter((ingredient) =>
      aliasesForIngredient(ingredient).some((alias) =>
        containsAlias(words, alias)
      )
    )
    .map((ingredient) => ingredient.id);

  if (/\bdry ingredients?\b/i.test(instruction)) {
    ids.push(
      ...ingredients
        .filter((ingredient) => classifyIngredient(ingredient, "dry"))
        .map((ingredient) => ingredient.id)
    );
  }
  if (/\bwet ingredients?\b/i.test(instruction)) {
    ids.push(
      ...ingredients
        .filter((ingredient) => classifyIngredient(ingredient, "wet"))
        .map((ingredient) => ingredient.id)
    );
  }

  return {
    ids: [...new Set(ids)],
    confidence: ids.length > 0 ? 0.9 : 0.58
  };
}

function findDuration(instruction: string): {
  display?: string;
  seconds?: number;
} {
  const range = instruction.match(
    /\b(\d+)\s*(?:to|–|-)\s*(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i
  );
  if (range) {
    const unit = range[3].toLowerCase();
    const multiplier = unit.startsWith("hour")
      ? 3600
      : unit.startsWith("sec")
        ? 1
        : 60;
    return {
      display: `${range[1]}–${range[2]} ${range[3]}`,
      seconds: Number(range[1]) * multiplier
    };
  }

  const single = instruction.match(
    /\b(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i
  );
  if (!single) return {};
  const unit = single[2].toLowerCase();
  const multiplier = unit.startsWith("hour")
    ? 3600
    : unit.startsWith("sec")
      ? 1
      : 60;
  return {
    display: `${single[1]} ${single[2]}`,
    seconds: Number(single[1]) * multiplier
  };
}

function findTemperature(instruction: string): string | undefined {
  const match = instruction.match(
    /\b\d{2,3}\s*°?\s*[FC]\b(?:\s*\(\s*\d{2,3}\s*°?\s*[FC]\s*\))?/i
  );
  return match?.[0].replace(/\s+/g, " ");
}

function actionLabel(instruction: string, suggested?: string): string {
  if (suggested?.trim()) return suggested.trim().slice(0, 64);
  const words = normalizedWords(instruction);
  const verb = ACTION_VERBS.find((candidate) => words.includes(candidate));
  if (verb) {
    const normalized = verb === "saute" ? "sauté" : verb;
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  const firstWords = instruction
    .replace(/^[\s\d.)-]+/, "")
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
  return firstWords || "Continue";
}

export function compileRecipe(
  recipe: Recipe,
  linkPlan: IngredientStepLink[] = []
): CompiledRecipe {
  const setupSteps = recipe.steps.filter((step) => step.isSetup);
  const processSteps = recipe.steps.filter((step) => !step.isSetup);
  const planByStep = new Map(linkPlan.map((link) => [link.stepIndex, link]));
  const inferred = processSteps.map((step) => {
    const originalStepIndex = recipe.steps.findIndex(
      (candidate) => candidate.id === step.id
    );
    const planned = planByStep.get(originalStepIndex);
    if (planned) {
      const ids = planned.ingredientIndexes
        .filter(
          (index) => Number.isInteger(index) && recipe.ingredients[index]
        )
        .map((index) => recipe.ingredients[index].id);
      return {
        step,
        originalStepIndex,
        ids: [...new Set(ids)],
        confidence: Math.max(0, Math.min(1, planned.confidence ?? 0.92)),
        label: planned.shortLabel
      };
    }
    const local = inferIngredientIds(step.raw, recipe.ingredients);
    return {
      step,
      originalStepIndex,
      ...local,
      label: undefined
    };
  });

  const firstUse = new Map<string, number>();
  inferred.forEach((entry, stepIndex) => {
    entry.ids.forEach((id) => {
      if (!firstUse.has(id)) firstUse.set(id, stepIndex);
    });
  });

  const orderedIngredients = recipe.ingredients
    .map((ingredient, originalIndex) => ({
      ingredient,
      originalIndex,
      firstUse: firstUse.get(ingredient.id) ?? Number.MAX_SAFE_INTEGER
    }))
    .sort(
      (a, b) =>
        a.firstUse - b.firstUse || a.originalIndex - b.originalIndex
    )
    .map(({ ingredient }) => ingredient);
  const rowById = new Map(
    orderedIngredients.map((ingredient, index) => [ingredient.id, index])
  );

  const warnings: string[] = [];
  const unused = orderedIngredients.filter(
    (ingredient) => !firstUse.has(ingredient.id) && !ingredient.optional
  );
  if (unused.length) {
    warnings.push(
      `Could not confidently place ${unused
        .map((ingredient) => ingredient.name)
        .join(", ")}. Review the mapping before cooking.`
    );
  }

  const activeRows = new Set<number>();
  const actions: CompiledAction[] = inferred.map((entry, index) => {
    const directRows = entry.ids
      .map((id) => rowById.get(id))
      .filter((row): row is number => row !== undefined);
    directRows.forEach((row) => activeRows.add(row));
    const displayRows =
      directRows.length > 0
        ? directRows
        : activeRows.size > 0
          ? [...activeRows]
          : orderedIngredients.map((_, row) => row);
    const safeRows = displayRows.length ? displayRows : [0];
    const duration = findDuration(entry.step.raw);

    return {
      id: entry.step.id,
      stepIndex: entry.originalStepIndex,
      order: index,
      label: actionLabel(entry.step.raw, entry.label),
      instruction: entry.step.raw,
      ingredientIds: entry.ids,
      ingredientRowStart: Math.min(...safeRows),
      ingredientRowEnd: Math.max(...safeRows),
      duration: duration.display,
      durationSeconds: duration.seconds,
      temperature: findTemperature(entry.step.raw),
      confidence: entry.confidence
    };
  });

  const confidenceValues = actions.map((action) => action.confidence);
  const confidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) /
      confidenceValues.length
    : 0;

  return {
    recipe,
    orderedIngredients,
    setupSteps,
    actions,
    warnings,
    confidence
  };
}

export function recipeToTsv(compiled: CompiledRecipe): string {
  const headers = ["Ingredient", ...compiled.actions.map((action) => action.label)];
  const rows = compiled.orderedIngredients.map((ingredient, rowIndex) => [
    ingredient.raw,
    ...compiled.actions.map((action) =>
      rowIndex >= action.ingredientRowStart &&
      rowIndex <= action.ingredientRowEnd
        ? action.label
        : ""
    )
  ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => cell.replace(/\t|\n/g, " ")).join("\t"))
    .join("\n");
}
