import { describe, expect, it } from "vitest";
import { validatePublicRecipeUrl } from "./security";

describe("validatePublicRecipeUrl", () => {
  it.each([
    "http://localhost/recipe",
    "http://127.0.0.1/admin",
    "http://10.0.0.8/internal",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.4/recipe",
    "http://[::1]/recipe",
    "http://service.internal/recipe",
    "file:///etc/passwd"
  ])("blocks unsafe destination %s", (value) => {
    expect(() => validatePublicRecipeUrl(value)).toThrow();
  });

  it("normalizes a public recipe URL", () => {
    expect(
      validatePublicRecipeUrl("https://www.example.com/recipe?q=1#comments").toString()
    ).toBe("https://www.example.com/recipe?q=1");
  });

  it("blocks credentials embedded in a URL", () => {
    expect(() =>
      validatePublicRecipeUrl("https://user:secret@example.com/recipe")
    ).toThrow(/credentials/);
  });
});

