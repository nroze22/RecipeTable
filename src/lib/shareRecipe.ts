import type { Recipe } from "../types";

const HASH_KEY = "recipe";
const MAX_SHARE_BYTES = 48_000;

interface CompactRecipe {
  v: 1;
  t: string;
  d?: string;
  y?: string;
  p?: string;
  c?: string;
  z?: string;
  i: string[];
  s: Array<[string, 0 | 1]>;
  n?: string;
  u?: string;
}

function compact(recipe: Recipe): CompactRecipe {
  return {
    v: 1,
    t: recipe.title.slice(0, 180),
    d: recipe.description?.slice(0, 500),
    y: recipe.yield?.slice(0, 120),
    p: recipe.prepTime?.slice(0, 80),
    c: recipe.cookTime?.slice(0, 80),
    z: recipe.totalTime?.slice(0, 80),
    i: recipe.ingredients.slice(0, 80).map((item) => item.raw.slice(0, 320)),
    s: recipe.steps
      .slice(0, 80)
      .map((step) => [step.raw.slice(0, 700), step.isSetup ? 1 : 0]),
    n: recipe.source?.siteName?.slice(0, 140),
    u: recipe.source?.url?.slice(0, 1200)
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

async function compress(text: string): Promise<{ mode: "g" | "j"; bytes: Uint8Array }> {
  const plain = new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") {
    return { mode: "j", bytes: plain };
  }

  try {
    const stream = new Blob([exactBuffer(plain)])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    return {
      mode: "g",
      bytes: new Uint8Array(await new Response(stream).arrayBuffer())
    };
  } catch {
    return { mode: "j", bytes: plain };
  }
}

async function decompress(mode: string, bytes: Uint8Array): Promise<string> {
  if (mode === "j") return new TextDecoder().decode(bytes);
  if (mode !== "g" || typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open the compressed recipe link.");
  }

  const stream = new Blob([exactBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

export async function createRecipeShareUrl(recipe: Recipe): Promise<string> {
  const payload = JSON.stringify(compact(recipe));
  const encoded = await compress(payload);
  const token = `${encoded.mode}.${bytesToBase64Url(encoded.bytes)}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = new URLSearchParams({ [HASH_KEY]: token }).toString();
  return url.toString();
}

export async function readSharedRecipe(): Promise<Recipe | null> {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get(HASH_KEY);
  if (!token) return null;
  if (token.length > MAX_SHARE_BYTES) throw new Error("That recipe link is too large.");

  const separator = token.indexOf(".");
  if (separator < 1) throw new Error("That recipe link is invalid.");
  const text = await decompress(
    token.slice(0, separator),
    base64UrlToBytes(token.slice(separator + 1))
  );
  if (text.length > 180_000) throw new Error("That recipe link expands beyond the safe limit.");
  const data = JSON.parse(text) as Partial<CompactRecipe>;

  if (
    data.v !== 1 ||
    typeof data.t !== "string" ||
    !Array.isArray(data.i) ||
    !Array.isArray(data.s) ||
    data.i.length === 0 ||
    data.s.length === 0
  ) {
    throw new Error("That recipe link is invalid.");
  }

  const ingredients = data.i
    .filter((item): item is string => typeof item === "string")
    .slice(0, 80)
    .map((raw, index) => ({
      id: `shared-ingredient-${index}`,
      raw: raw.slice(0, 320),
      name: raw.slice(0, 320)
    }));

  const steps = data.s
    .filter(
      (item): item is [string, 0 | 1] =>
        Array.isArray(item) && typeof item[0] === "string"
    )
    .slice(0, 80)
    .map(([raw, isSetup], index) => ({
      id: `shared-step-${index}`,
      order: index,
      raw: raw.slice(0, 700),
      isSetup: isSetup === 1
    }));

  if (ingredients.length === 0 || steps.length === 0) {
    throw new Error("That recipe link is incomplete.");
  }

  return {
    id: `shared-${typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now()}`,
    title: data.t.slice(0, 180),
    description: typeof data.d === "string" ? data.d.slice(0, 500) : undefined,
    yield: typeof data.y === "string" ? data.y.slice(0, 120) : undefined,
    prepTime: typeof data.p === "string" ? data.p.slice(0, 80) : undefined,
    cookTime: typeof data.c === "string" ? data.c.slice(0, 80) : undefined,
    totalTime: typeof data.z === "string" ? data.z.slice(0, 80) : undefined,
    ingredients,
    steps,
    source: {
      siteName: typeof data.n === "string" ? data.n.slice(0, 140) : "Shared recipe",
      url:
        typeof data.u === "string" && /^https?:\/\//.test(data.u)
          ? data.u.slice(0, 1200)
          : undefined
    },
    importedAt: new Date().toISOString()
  };
}

export function clearSharedRecipeHash(): void {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has(HASH_KEY)) return;
  params.delete(HASH_KEY);
  const hash = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`
  );
}
