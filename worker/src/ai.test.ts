import { describe, expect, it } from "vitest";
import { validateCompileRequest } from "./ai";

describe("validateCompileRequest", () => {
  it("keeps only valid setup indexes", () => {
    const input = validateCompileRequest({
      title: "Cake",
      ingredients: ["1 cup flour", "2 eggs"],
      steps: ["Preheat oven.", "Mix flour and eggs."],
      setupStepIndexes: [0, -1, 9, 1.5]
    });
    expect(input.setupStepIndexes).toEqual([0]);
  });

  it("rejects unbounded input", () => {
    expect(() =>
      validateCompileRequest({
        title: "Recipe",
        ingredients: Array.from({ length: 181 }, () => "1 cup flour"),
        steps: ["Mix."]
      })
    ).toThrow();
  });
});

