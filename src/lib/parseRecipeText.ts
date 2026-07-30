import type {
  Recipe,
  RecipeIngredient,
  RecipeSource,
  RecipeStep
} from "../types";

const INGREDIENT_HEADINGS = /^(ingredients?|what you(?:'|’)ll need)$/i;
const STEP_HEADINGS =
  /^(instructions?|directions?|method|preparation|steps?|how to make it)$/i;
const META_LINE =
  /^(prep(?:aration)? time|cook(?:ing)? time|total time|serves|servings?|yield|makes)\s*[:：]/i;
const QUANTITY_TOKEN =
  "(?:(?:\\d+\\s+)?\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\\s*[-–]\\s*(?:(?:\\d+\\s+)?\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?";
const UNIT_TOKEN =
  "(?:cups?|c\\.?|tablespoons?|tbsps?|tbsp\\.?|tbs\\.?|teaspoons?|tsps?|tsp\\.?|ounces?|oz\\.?|pounds?|lbs?|lb\\.?|grams?|g\\.?|kilograms?|kg\\.?|millilit(?:er|re)s?|m[lL]|lit(?:er|re)s?|[lL]\\.?|cloves?|cans?|packages?|packets?|sticks?|pinches?|dashes?|slices?|sprigs?|heads?|bunch(?:es)?|large|medium|small)";
const LEADING_QUANTITY = new RegExp(
  `^(${QUANTITY_TOKEN})(?:\\s+(${UNIT_TOKEN}))?(?:\\s*(\\([^)]{1,40}\\)))?\\s+(.+)$`,
  "i"
);
const INGREDIENT_LIKE = new RegExp(
  `^(?:[-–—•*]\\s*)?(?:${QUANTITY_TOKEN})(?:\\s+${UNIT_TOKEN})?\\b`,
  "i"
);
const SETUP_STEP =
  /\b(preheat|prepare (?:a|the) pan|grease|butter and flour|line (?:a|the)|position (?:a|the) rack|bring .* to (?:a )?(?:boil|simmer))\b/i;

function cleanLine(line: string): string {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/^[\s•●▪◦*–—-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "item";
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

export function parseIngredientLine(
  rawLine: string,
  usedIds = new Set<string>()
): RecipeIngredient {
  const raw = cleanLine(rawLine);
  const match = raw.match(LEADING_QUANTITY);
  let quantity: string | undefined;
  let unit: string | undefined;
  let remainder = raw;

  if (match) {
    unit = match[2]?.replace(/\.$/, "");
    quantity = [match[1], unit, match[3]].filter(Boolean).join(" ");
    remainder = match[4];
  }

  const commaIndex = remainder.indexOf(",");
  const name = (commaIndex >= 0 ? remainder.slice(0, commaIndex) : remainder)
    .replace(/^of\s+/i, "")
    .trim();
  const preparation =
    commaIndex >= 0 ? remainder.slice(commaIndex + 1).trim() : undefined;
  const optional = /\boptional\b|\bto taste\b/i.test(raw);

  return {
    id: uniqueId(slugify(name), usedIds),
    raw,
    quantity,
    unit,
    name: name || raw,
    preparation,
    optional
  };
}

function parseMeta(lines: string[]): Pick<
  Recipe,
  "yield" | "prepTime" | "cookTime" | "totalTime"
> {
  const result: Pick<
    Recipe,
    "yield" | "prepTime" | "cookTime" | "totalTime"
  > = {};
  for (const line of lines) {
    const [label = "", ...valueParts] = line.split(/[:：]/);
    const value = valueParts.join(":").trim();
    if (!value) continue;
    if (/^(serves|servings?|yield|makes)$/i.test(label.trim())) {
      result.yield = value;
    } else if (/^prep(?:aration)? time$/i.test(label.trim())) {
      result.prepTime = value;
    } else if (/^cook(?:ing)? time$/i.test(label.trim())) {
      result.cookTime = value;
    } else if (/^total time$/i.test(label.trim())) {
      result.totalTime = value;
    }
  }
  return result;
}

function collectInstructionLines(lines: string[]): string[] {
  const output: string[] = [];
  let current = "";
  const numbered = lines.some((line) => /^\s*(?:step\s*)?\d+[.)]\s+/i.test(line));

  for (const original of lines) {
    const line = cleanLine(
      original.replace(/^\s*(?:step\s*)?\d+[.)]\s+/i, "")
    );
    if (!line || META_LINE.test(line)) continue;

    if (!numbered) {
      output.push(line);
      continue;
    }

    const startsStep = /^\s*(?:step\s*)?\d+[.)]\s+/i.test(original);
    if (startsStep && current) {
      output.push(current);
      current = line;
    } else {
      current = [current, line].filter(Boolean).join(" ");
    }
  }

  if (current) output.push(current);
  return output;
}

function inferSections(lines: string[]): {
  title: string;
  ingredientLines: string[];
  instructionLines: string[];
} {
  const ingredientIndex = lines.findIndex((line) =>
    INGREDIENT_HEADINGS.test(cleanLine(line))
  );
  const stepIndex = lines.findIndex((line) => STEP_HEADINGS.test(cleanLine(line)));

  if (ingredientIndex >= 0) {
    const ingredientEnd =
      stepIndex > ingredientIndex ? stepIndex : lines.length;
    const titleCandidates = lines
      .slice(0, ingredientIndex)
      .map(cleanLine)
      .filter((line) => line && !META_LINE.test(line));
    return {
      title: titleCandidates[0] || "Untitled recipe",
      ingredientLines: lines
        .slice(ingredientIndex + 1, ingredientEnd)
        .map(cleanLine)
        .filter((line) => line && !META_LINE.test(line)),
      instructionLines:
        stepIndex >= 0 ? lines.slice(stepIndex + 1) : lines.slice(ingredientEnd)
    };
  }

  const cleaned = lines.map(cleanLine).filter(Boolean);
  const title = cleaned[0] && !INGREDIENT_LIKE.test(cleaned[0])
    ? cleaned[0]
    : "Scanned recipe";
  const body = title === cleaned[0] ? cleaned.slice(1) : cleaned;
  let firstIngredient = body.findIndex((line) => INGREDIENT_LIKE.test(line));
  if (firstIngredient < 0) firstIngredient = 0;

  let ingredientEnd = firstIngredient;
  let seenIngredients = 0;
  while (ingredientEnd < body.length) {
    const line = body[ingredientEnd];
    if (INGREDIENT_LIKE.test(line) || /\bto taste\b/i.test(line)) {
      seenIngredients += 1;
      ingredientEnd += 1;
      continue;
    }
    if (seenIngredients >= 2) break;
    ingredientEnd += 1;
  }

  return {
    title,
    ingredientLines: body.slice(firstIngredient, ingredientEnd),
    instructionLines: body.slice(ingredientEnd)
  };
}

export function recipeFromParts(input: {
  title: string;
  ingredientLines: string[];
  instructionLines: string[];
  source?: RecipeSource;
  description?: string;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
}): Recipe {
  const usedIds = new Set<string>();
  const ingredients = input.ingredientLines
    .map(cleanLine)
    .filter(Boolean)
    .map((line) => parseIngredientLine(line, usedIds));
  const steps: RecipeStep[] = input.instructionLines
    .map(cleanLine)
    .filter(Boolean)
    .map((raw, order) => ({
      id: uniqueId(
        slugify(raw.split(/\s+/).slice(0, 5).join(" ")),
        usedIds
      ),
      order,
      raw,
      isSetup: SETUP_STEP.test(raw)
    }));

  return {
    id: `${slugify(input.title)}-${Date.now().toString(36)}`,
    title: input.title.trim() || "Untitled recipe",
    description: input.description,
    yield: input.yield,
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    totalTime: input.totalTime,
    ingredients,
    steps,
    source: input.source,
    importedAt: new Date().toISOString()
  };
}

export function parseRecipeText(text: string, source?: RecipeSource): Recipe {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = inferSections(lines);
  const meta = parseMeta(lines);

  return recipeFromParts({
    title: sections.title,
    ingredientLines: sections.ingredientLines,
    instructionLines: collectInstructionLines(sections.instructionLines),
    source,
    ...meta
  });
}

export function looksLikeIngredient(line: string): boolean {
  return INGREDIENT_LIKE.test(cleanLine(line));
}
