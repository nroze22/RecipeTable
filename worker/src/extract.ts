import type { ExtractedRecipe } from "./types";

type JsonRecord = Record<string, unknown>;

const MAX_INGREDIENTS = 180;
const MAX_INSTRUCTIONS = 120;
const MAX_FIELD_LENGTH = 800;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };
  return value
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}

function stripMarkup(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  ).slice(0, MAX_FIELD_LENGTH);
}

function cleanText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const cleaned = stripMarkup(value);
    return cleaned || undefined;
  }
  if (typeof value === "number") return String(value);
  return undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return undefined;
}

function schemaTypes(node: JsonRecord): string[] {
  const value = node["@type"];
  return (Array.isArray(value) ? value : [value])
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.toLowerCase());
}

function collectRecipeNodes(value: unknown, output: JsonRecord[], depth = 0): void {
  if (depth > 10 || output.length > 30) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectRecipeNodes(entry, output, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  if (schemaTypes(value).includes("recipe")) output.push(value);
  for (const [key, child] of Object.entries(value)) {
    if (
      key === "@graph" ||
      key === "mainEntity" ||
      key === "mainEntityOfPage" ||
      key === "subjectOf" ||
      key === "itemListElement"
    ) {
      collectRecipeNodes(child, output, depth + 1);
    }
  }
}

function parseJsonLdScripts(html: string): unknown[] {
  const parsed: unknown[] = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    if (!/\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)/i.test(match[1])) {
      continue;
    }
    const candidate = match[2]
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "")
      .trim();
    if (!candidate) continue;
    try {
      parsed.push(JSON.parse(candidate));
    } catch {
      try {
        parsed.push(JSON.parse(decodeEntities(candidate)));
      } catch {
        // Malformed structured data is ignored in favor of other page candidates.
      }
    }
  }
  return parsed;
}

function textArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((entry) => {
      if (typeof entry === "string") return stripMarkup(entry);
      if (isRecord(entry)) {
        return firstText(entry.name, entry.text, entry.value);
      }
      return undefined;
    })
    .filter((entry): entry is string => Boolean(entry));
}

function flattenInstructions(value: unknown, output: string[] = []): string[] {
  if (output.length >= MAX_INSTRUCTIONS || value == null) return output;
  if (typeof value === "string") {
    const parts = value
      .split(/\r?\n+/)
      .map(stripMarkup)
      .filter(Boolean);
    output.push(...parts);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenInstructions(entry, output));
    return output;
  }
  if (!isRecord(value)) return output;

  const nested =
    value.itemListElement ??
    value.steps ??
    value.recipeInstructions ??
    value.instructions;
  if (nested) {
    flattenInstructions(nested, output);
  } else {
    const text = firstText(value.text, value.name, value.description);
    if (text) output.push(text);
  }
  return output;
}

function isoDuration(value: unknown): string | undefined {
  const raw = cleanText(value);
  if (!raw) return undefined;
  const match = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
  );
  if (!match) return raw;
  const parts = [
    match[1] ? `${match[1]} day${match[1] === "1" ? "" : "s"}` : "",
    match[2] ? `${match[2]} hr` : "",
    match[3] ? `${match[3]} min` : "",
    match[4] ? `${match[4]} sec` : ""
  ].filter(Boolean);
  return parts.join(" ");
}

function imageUrl(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = imageUrl(entry);
      if (url) return url;
    }
  }
  if (isRecord(value)) {
    return firstText(value.url, value.contentUrl);
  }
  return undefined;
}

function authorName(value: unknown): string | undefined {
  if (typeof value === "string") return cleanText(value);
  if (Array.isArray(value)) {
    return value.map(authorName).filter(Boolean).join(", ") || undefined;
  }
  if (isRecord(value)) return firstText(value.name, value.url);
  return undefined;
}

function metaContent(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta\\b[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*>`,
      "i"
    )
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return stripMarkup(match[1]);
  }
  return undefined;
}

function canonicalUrl(html: string, fallback: string): string {
  const match = html.match(
    /<link\b[^>]*rel\s*=\s*["'][^"']*\bcanonical\b[^"']*["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>|<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i
  );
  try {
    return new URL(match?.[1] || match?.[2] || fallback, fallback).toString();
  } catch {
    return fallback;
  }
}

function extractItemProp(html: string, property: string): string[] {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const values: string[] = [];
  const paired = new RegExp(
    `<([a-z0-9:-]+)\\b[^>]*itemprop\\s*=\\s*["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1\\s*>`,
    "gi"
  );
  for (const match of html.matchAll(paired)) {
    const value = stripMarkup(match[2]);
    if (value) values.push(value);
  }
  const content = new RegExp(
    `<[^>]+itemprop\\s*=\\s*["'][^"']*\\b${escaped}\\b[^"']*["'][^>]+content\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "gi"
  );
  for (const match of html.matchAll(content)) {
    const value = stripMarkup(match[1]);
    if (value) values.push(value);
  }
  return [...new Set(values)];
}

function recipeFromNode(
  node: JsonRecord,
  html: string,
  pageUrl: string
): ExtractedRecipe | null {
  const ingredients = textArray(
    node.recipeIngredient ?? node.ingredients ?? node.supply
  ).slice(0, MAX_INGREDIENTS);
  const instructions = flattenInstructions(
    node.recipeInstructions ?? node.instructions ?? node.step
  ).slice(0, MAX_INSTRUCTIONS);
  if (ingredients.length < 1 || instructions.length < 1) return null;

  const pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
  return {
    title:
      firstText(node.name, node.headline, metaContent(html, "og:title")) ||
      "Untitled recipe",
    description: firstText(node.description),
    yield: textArray(node.recipeYield ?? node.yield).join(", ") || undefined,
    prepTime: isoDuration(node.prepTime),
    cookTime: isoDuration(node.cookTime),
    totalTime: isoDuration(node.totalTime),
    ingredients,
    instructions,
    source: {
      url: canonicalUrl(html, pageUrl),
      siteName:
        firstText(
          isRecord(node.publisher) ? node.publisher.name : undefined,
          metaContent(html, "og:site_name")
        ) || pageHost,
      author: authorName(node.author),
      image: imageUrl(node.image) || metaContent(html, "og:image")
    }
  };
}

function fallbackRecipe(html: string, pageUrl: string): ExtractedRecipe | null {
  const ingredients = extractItemProp(html, "recipeIngredient").slice(
    0,
    MAX_INGREDIENTS
  );
  const instructions = extractItemProp(html, "recipeInstructions").slice(
    0,
    MAX_INSTRUCTIONS
  );
  if (!ingredients.length || !instructions.length) return null;
  const title =
    extractItemProp(html, "name")[0] ||
    metaContent(html, "og:title") ||
    stripMarkup(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "") ||
    "Untitled recipe";
  return {
    title,
    ingredients,
    instructions,
    source: {
      url: canonicalUrl(html, pageUrl),
      siteName:
        metaContent(html, "og:site_name") ||
        new URL(pageUrl).hostname.replace(/^www\./, ""),
      image: metaContent(html, "og:image")
    }
  };
}

export function extractRecipeFromHtml(
  html: string,
  pageUrl: string
): ExtractedRecipe {
  const nodes: JsonRecord[] = [];
  parseJsonLdScripts(html).forEach((value) => collectRecipeNodes(value, nodes));
  const candidates = nodes
    .map((node) => recipeFromNode(node, html, pageUrl))
    .filter((recipe): recipe is ExtractedRecipe => Boolean(recipe))
    .sort(
      (a, b) =>
        b.ingredients.length +
        b.instructions.length -
        (a.ingredients.length + a.instructions.length)
    );
  const recipe = candidates[0] || fallbackRecipe(html, pageUrl);
  if (!recipe) {
    throw new Error(
      "No structured recipe card was found on that page. Upload a screenshot or paste the recipe text instead."
    );
  }
  return recipe;
}

