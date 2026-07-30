import { toPng } from "html-to-image";
import type { CompiledRecipe } from "../types";
import { recipeToTsv } from "./recipeGraph";

function safeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "recipe"
  );
}

export async function downloadRecipePng(
  element: HTMLElement,
  title: string
): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: "#fbf8f1",
    pixelRatio: Math.min(3, window.devicePixelRatio || 2),
    cacheBust: true,
    style: {
      transform: "none",
      margin: "0"
    }
  });
  const link = document.createElement("a");
  link.download = `${safeFilename(title)}-recipe-table.png`;
  link.href = dataUrl;
  link.click();
}

export async function copyRecipeTable(
  compiled: CompiledRecipe
): Promise<void> {
  await navigator.clipboard.writeText(recipeToTsv(compiled));
}

