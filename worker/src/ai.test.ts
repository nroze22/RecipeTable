import { describe, expect, it } from "vitest";
import {
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
