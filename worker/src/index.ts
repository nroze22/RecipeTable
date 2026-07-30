import { compileIngredientLinks } from "./ai";
import { extractRecipeFromHtml } from "./extract";
import {
  fetchRecipePage,
  RequestSafetyError,
  validatePublicRecipeUrl
} from "./security";
import type { Env, ExecutionContextLike } from "./types";

const MAX_REQUEST_BYTES = 96 * 1024;

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return "*";
  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes("*") || configured.includes(origin)) return origin;
  return null;
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff"
  };
}

function json(
  value: unknown,
  status: number,
  origin: string | null,
  extraHeaders: HeadersInit = {}
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders(origin), ...extraHeaders }
  });
}

async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || "0");
  if (declared > MAX_REQUEST_BYTES) {
    throw new RequestSafetyError(
      "Request body is too large.",
      "REQUEST_TOO_LARGE",
      413
    );
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    throw new RequestSafetyError(
      "Request body is too large.",
      "REQUEST_TOO_LARGE",
      413
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestSafetyError("Invalid JSON body.", "INVALID_JSON");
  }
}

async function cacheRequestFor(url: string): Promise<Request> {
  const bytes = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const key = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return new Request(`https://recipe-cache.invalid/v1/${key}`);
}

async function handleExtract(
  request: Request,
  origin: string,
  context: ExecutionContextLike
): Promise<Response> {
  const body = (await readJson(request)) as { url?: unknown };
  if (typeof body.url !== "string" || body.url.length > 4_096) {
    throw new RequestSafetyError("A recipe URL is required.", "URL_REQUIRED");
  }
  const normalized = validatePublicRecipeUrl(body.url).toString();
  const cacheKey = await cacheRequestFor(normalized);
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    const payload = (await cached.json()) as { recipe: unknown };
    return json({ ...payload, cached: true }, 200, origin, {
      "x-recipe-cache": "HIT"
    });
  }

  const { html, finalUrl } = await fetchRecipePage(normalized);
  let recipe;
  try {
    recipe = extractRecipeFromHtml(html, finalUrl);
  } catch (error) {
    throw new RequestSafetyError(
      error instanceof Error ? error.message : "No recipe card was found.",
      "RECIPE_NOT_FOUND",
      422
    );
  }

  const cacheResponse = new Response(JSON.stringify({ recipe }), {
    headers: {
      "cache-control": "public, max-age=21600",
      "content-type": "application/json"
    }
  });
  context.waitUntil(caches.default.put(cacheKey, cacheResponse));
  return json({ recipe, cached: false }, 200, origin, {
    "x-recipe-cache": "MISS"
  });
}

async function handleCompile(
  request: Request,
  env: Env,
  origin: string
): Promise<Response> {
  const body = await readJson(request);
  try {
    const links = await compileIngredientLinks(env, body);
    return json({ links }, 200, origin);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The smart mapping pass failed.";
    return json(
      { error: { code: "AI_UNAVAILABLE", message } },
      message.includes("not configured") ? 503 : 422,
      origin
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (!origin) {
      return json(
        {
          error: {
            code: "ORIGIN_NOT_ALLOWED",
            message: "This web origin is not allowed to use the recipe service."
          }
        },
        403,
        null
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
        return json(
          {
            ok: true,
            service: "RecipeTable extractor",
            endpoints: ["POST /extract", "POST /compile"]
          },
          200,
          origin
        );
      }
      if (request.method === "POST" && url.pathname === "/extract") {
        return await handleExtract(request, origin, context);
      }
      if (request.method === "POST" && url.pathname === "/compile") {
        return await handleCompile(request, env, origin);
      }
      return json(
        { error: { code: "NOT_FOUND", message: "Endpoint not found." } },
        404,
        origin
      );
    } catch (error) {
      if (error instanceof RequestSafetyError) {
        return json(
          { error: { code: error.code, message: error.message } },
          error.status,
          origin
        );
      }
      return json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "The recipe service could not complete that request."
          }
        },
        500,
        origin
      );
    }
  }
};
