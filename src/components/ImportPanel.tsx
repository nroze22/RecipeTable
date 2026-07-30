import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { SAMPLE_RECIPE } from "../data/sample";
import { recognizeRecipeImage } from "../lib/ocr";
import { parseRecipeText } from "../lib/parseRecipeText";
import {
  extractRecipeUrl,
  isWorkerConfigured,
  reconstructRecipeOcr
} from "../lib/workerClient";
import type { Recipe } from "../types";
import { Icon, type IconName } from "./Icon";

type ImportMode = "url" | "image" | "text";

const modes: Array<{ id: ImportMode; label: string; icon: IconName }> = [
  { id: "url", label: "Recipe URL", icon: "link" },
  { id: "image", label: "Photo", icon: "camera" },
  { id: "text", label: "Paste text", icon: "text" }
];

interface ImportPanelProps {
  onImport: (recipe: Recipe, notice?: string, optimizeFlow?: boolean) => void;
}

export function ImportPanel({ onImport }: ImportPanelProps) {
  const [mode, setMode] = useState<ImportMode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function resetFeedback() {
    setError("");
    setStatus("");
    setProgress(0);
  }

  function chooseMode(next: ImportMode) {
    setMode(next);
    resetFeedback();
  }

  async function importUrl(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setError("Paste a complete recipe link beginning with http:// or https://.");
      return;
    }

    setBusy(true);
    setStatus("Finding the recipe card");
    try {
      const recipe = await extractRecipeUrl(parsed.toString());
      onImport(recipe);
      setStatus("Recipe ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That recipe could not be imported.");
    } finally {
      setBusy(false);
    }
  }

  async function importImage() {
    if (!file) {
      setError("Choose a clear photo or screenshot of the recipe.");
      return;
    }
    resetFeedback();
    setBusy(true);
    try {
      const recognized = await recognizeRecipeImage(file, (next) => {
        setProgress(next.progress);
        setStatus(next.status);
      });
      const localRecipe = parseRecipeText(recognized, {
        siteName: `Scanned from ${file.name}`
      });

      if (isWorkerConfigured()) {
        setStatus("Cleaning up the scan with AI");
        try {
          const reconstructed = await reconstructRecipeOcr(recognized, file.name);
          const uncertainty =
            reconstructed.warnings.length > 0
              ? ` Notes: ${reconstructed.warnings.slice(0, 2).join(" ")}`
              : "";
          const notice =
            reconstructed.mode === "approximated"
              ? `This image did not contain a complete recipe, so AI created a close culinary approximation from the visible evidence. Review every quantity and step, then use Edit for corrections.${uncertainty}`
              : `AI reconstructed this recipe from locally extracted text. It is a close approximation—review quantities and steps, then use Edit for any corrections.${uncertainty}`;
          onImport(reconstructed.recipe, notice, true);
          setStatus(
            reconstructed.mode === "approximated"
              ? "Culinary approximation ready"
              : "AI-assisted reconstruction ready"
          );
          return;
        } catch {
          // Keep the scan useful if Workers AI is temporarily unavailable.
        }
      }

      if (localRecipe.ingredients.length === 0 || localRecipe.steps.length === 0) {
        throw new Error(
          "The scan was too incomplete to structure locally, and AI cleanup was unavailable. Try a tighter, brighter crop."
        );
      }
      onImport(
        localRecipe,
        "Tesseract created a local approximation. Review quantities and steps, then use Edit for any corrections."
      );
      setStatus("Local approximation ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The image could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function importText(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    if (text.trim().length < 30) {
      setError("Paste the recipe title, ingredients, and directions first.");
      return;
    }
    onImport(parseRecipeText(text, { siteName: "Pasted recipe" }));
    setStatus("Recipe ready");
  }

  function acceptFile(next: File | undefined) {
    if (!next) return;
    setFile(next);
    resetFeedback();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  return (
    <section className="import-card" aria-labelledby="import-title">
      <div className="import-heading">
        <div>
          <span className="eyebrow">Start with anything</span>
          <h2 id="import-title">Bring in a recipe</h2>
        </div>
        <button
          className="sample-button"
          type="button"
          onClick={() => onImport(SAMPLE_RECIPE)}
        >
          Try the sample
          <Icon name="arrow" size={17} />
        </button>
      </div>

      <div className="import-tabs" role="tablist" aria-label="Import method">
        {modes.map((item) => (
          <button
            key={item.id}
            className={mode === item.id ? "import-tab active" : "import-tab"}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => chooseMode(item.id)}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
      </div>

      {mode === "url" && (
        <form className="import-form" onSubmit={importUrl}>
          <label htmlFor="recipe-url">Recipe page</label>
          <div className="url-control">
            <Icon name="link" size={20} />
            <input
              id="recipe-url"
              type="url"
              inputMode="url"
              placeholder="https://example.com/the-perfect-pasta"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={busy}
              autoComplete="url"
            />
            <button className="primary-button compact" type="submit" disabled={busy}>
              {busy ? "Importing…" : "Make table"}
              {!busy && <Icon name="arrow" size={18} />}
            </button>
          </div>
          <p className="field-note">
            We read the page’s recipe card—not the preamble, ads, or pop-ups.
          </p>
        </form>
      )}

      {mode === "image" && (
        <div className="import-form">
          <label>Recipe photo or screenshot</label>
          <div
            className={dragging ? "drop-zone dragging" : "drop-zone"}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInput.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                fileInput.current?.click();
              }
            }}
          >
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />
            <span className="drop-icon">
              <Icon name={file ? "check" : "scan"} size={25} />
            </span>
            <strong>{file ? file.name : "Drop a photo here"}</strong>
            <span>{file ? "Tap to choose a different image" : "or tap to choose one"}</span>
          </div>
          <button
            className="primary-button full"
            type="button"
            onClick={importImage}
            disabled={busy || !file}
          >
            {busy ? status || "Reading recipe…" : "Read recipe"}
            {!busy && <Icon name="arrow" size={18} />}
          </button>
        </div>
      )}

      {mode === "text" && (
        <form className="import-form" onSubmit={importText}>
          <label htmlFor="recipe-text">Recipe text</label>
          <textarea
            id="recipe-text"
            rows={8}
            placeholder={"Chocolate cake\n\nIngredients\n2 cups flour\n1 cup sugar\n…\n\nInstructions\n1. Preheat the oven…"}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button className="primary-button full" type="submit">
            Make table
            <Icon name="arrow" size={18} />
          </button>
        </form>
      )}

      {(busy || progress > 0) && (
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${Math.max(progress * 100, busy ? 12 : 0)}%` }} />
        </div>
      )}
      <div className="import-feedback" aria-live="polite">
        {error && <p className="error-message">{error}</p>}
        {!error && status && <p className="success-message">{status}</p>}
      </div>
      <div className="privacy-note">
        <Icon name="shield" size={17} />
        Your image stays in the browser. For AI cleanup, only the extracted text is sent to Cloudflare.
      </div>
    </section>
  );
}

