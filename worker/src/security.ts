const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 9_000;

export class RequestSafetyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

function parseIpv4(hostname: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return null;
  const parts = hostname.split(".").map(Number);
  if (parts.some((part) => part < 0 || part > 255)) return null;
  return parts;
}

function isPrivateIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized.includes(":")) return false;
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function validatePublicRecipeUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RequestSafetyError(
      "Paste a complete recipe URL.",
      "INVALID_URL"
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new RequestSafetyError(
      "Only HTTP and HTTPS recipe links are supported.",
      "INVALID_PROTOCOL"
    );
  }
  if (url.username || url.password) {
    throw new RequestSafetyError(
      "Recipe links cannot contain credentials.",
      "URL_CREDENTIALS"
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".example")
  ) {
    throw new RequestSafetyError(
      "That host cannot be fetched.",
      "PRIVATE_HOST"
    );
  }

  const ipv4 = parseIpv4(hostname);
  if ((ipv4 && isPrivateIpv4(ipv4)) || isPrivateIpv6(hostname)) {
    throw new RequestSafetyError(
      "Private network addresses cannot be fetched.",
      "PRIVATE_ADDRESS"
    );
  }

  url.hash = "";
  return url;
}

async function readLimitedBody(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > MAX_HTML_BYTES) {
    throw new RequestSafetyError(
      "That recipe page is too large to process safely.",
      "PAGE_TOO_LARGE",
      413
    );
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new RequestSafetyError(
          "That recipe page is too large to process safely.",
          "PAGE_TOO_LARGE",
          413
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function fetchRecipePage(
  value: string
): Promise<{ html: string; finalUrl: string }> {
  let url = validatePublicRecipeUrl(value);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9",
          "accept-language": "en-US,en;q=0.8",
          "user-agent":
            "RecipeTable/1.0 (+https://github.com/nroze22/RecipeTable; user-requested recipe import)"
        }
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RequestSafetyError(
          "That recipe page took too long to respond.",
          "FETCH_TIMEOUT",
          504
        );
      }
      throw new RequestSafetyError(
        "The recipe page could not be reached.",
        "FETCH_FAILED",
        502
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new RequestSafetyError(
          "The recipe page redirected too many times.",
          "TOO_MANY_REDIRECTS",
          502
        );
      }
      url = validatePublicRecipeUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      const message =
        response.status === 401 || response.status === 403
          ? "That site blocked the import. Upload a screenshot or paste the recipe text instead."
          : `The recipe site returned ${response.status}.`;
      throw new RequestSafetyError(message, "UPSTREAM_ERROR", 422);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new RequestSafetyError(
        "That link does not point to a web recipe page.",
        "UNSUPPORTED_CONTENT",
        415
      );
    }

    return {
      html: await readLimitedBody(response),
      finalUrl: url.toString()
    };
  }

  throw new RequestSafetyError(
    "The recipe page could not be fetched.",
    "FETCH_FAILED",
    502
  );
}

