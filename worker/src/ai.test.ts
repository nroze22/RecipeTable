import { describe, expect, it } from "vitest";
import {
  isFlowReady,
  validateCompileRequest,
  validateOcrReconstructionRequest
} from "./ai";

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



describe("validateOcrReconstructionRequest", () => {
  it("accepts bounded OCR evidence and sanitizes the file name", () => {
    const input = validateOcrReconstructionRequest({
      text: "Chocolate cake\n2 cups flour\nMix and bake until done.",
      fileName: "<cookbook-page>.jpg"
    });
    expect(input.text).toContain("2 cups flour");
    expect(input.fileName).toBe("cookbook-page.jpg");
  });

  it("rejects empty and oversized OCR evidence", () => {
    expect(() => validateOcrReconstructionRequest({ text: "too short" })).toThrow();
    expect(() =>
      validateOcrReconstructionRequest({ text: "x".repeat(48_001) })
    ).toThrow();
  });
});


describe("isFlowReady", () => {
  it("rejects one-shallow-step-per-ingredient approximations", () => {
    expect(
      isFlowReady({
        mode: "approximated",
        recipe: {
          title: "Cake",
          ingredients: ["Eggs", "Baking powder", "Milk", "Sugar"],
          instructions: [
            "Use eggs",
            "Use baking powder",
            "Use milk",
            "Use sugar"
          ]
        },
        confidence: 0.5,
        warnings: []
      })
    ).toBe(false);
  });

  it("accepts quantified, grouped cooking flows", () => {
    expect(
      isFlowReady({
        mode: "approximated",
        recipe: {
          title: "Vanilla cake",
          ingredients: [
            "2 cups all-purpose flour",
            "2 tsp baking powder",
            "1 cup sugar",
            "2 large eggs",
            "1 cup milk"
          ],
          instructions: [
            "Preheat the oven to 350°F and prepare an 8-inch pan.",
            "Whisk the flour and baking powder together in a bowl.",
            "Beat the sugar and eggs until pale and fluffy.",
            "Fold the flour mixture into the eggs, alternating with the milk.",
            "Bake until the center springs back, about 30 minutes."
          ]
        },
        confidence: 0.5,
        warnings: ["Quantities and baking time were estimated."]
      })
    ).toBe(true);
  });
});
