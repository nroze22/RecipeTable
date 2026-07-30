import { describe, expect, it } from "vitest";
import { allowedOrigin } from "./index";

describe("allowedOrigin", () => {
  it("always allows the app's own origin", () => {
    const request = new Request("https://recipe-table.example/extract", {
      headers: { origin: "https://recipe-table.example" }
    });

    expect(
      allowedOrigin(request, { ALLOWED_ORIGINS: "http://localhost:5173" })
    ).toBe("https://recipe-table.example");
  });

  it("allows an explicitly configured external origin", () => {
    const request = new Request("https://api.example/extract", {
      headers: { origin: "https://preview.example" }
    });

    expect(
      allowedOrigin(request, {
        ALLOWED_ORIGINS:
          "https://production.example, https://preview.example"
      })
    ).toBe("https://preview.example");
  });

  it("rejects an unlisted cross-origin request", () => {
    const request = new Request("https://api.example/extract", {
      headers: { origin: "https://untrusted.example" }
    });

    expect(
      allowedOrigin(request, {
        ALLOWED_ORIGINS: "https://production.example"
      })
    ).toBeNull();
  });
});
