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
  const [demoRunning, setDemoRunning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pipelinePhases = demoRunning
    ? ["Reading source", "Finding ingredients", "Mapping cooking logic", "Rendering your table"]
    : mode === "image"
      ? ["Preparing image", "Reading locally with OCR", "AI reconstruction", "Building visual flow"]
      : mode === "url"
        ? ["Validating link", "Finding recipe card", "Normalizing recipe", "Building visual flow"]
        : ["Reading text", "Structuring recipe", "Mapping ingredients", "Building visual flow"];

  const pipelineIndex =
    progress >= 0.9 ? 3 :
    progress >= 0.58 ? 2 :
    progress >= 0.2 ? 1 : 0;

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
    setProgress(0.24);
    setStatus("Finding the recipe card");
    const normalizationTimer = window.setTimeout(() => {
      setProgress(0.62);
      setStatus("Normalizing ingredients and directions");
    }, 700);
    try {
      const recipe = await extractRecipeUrl(parsed.toString());
      window.clearTimeout(normalizationTimer);
      setProgress(0.94);
      setStatus("Building the visual cooking flow");
      await wait(260);
      onImport(recipe);
      setProgress(1);
      setStatus("Recipe ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That recipe could not be imported.");
    } finally {
      window.clearTimeout(normalizationTimer);
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
        setProgress(0.7);
        setStatus("AI is reconstructing the recipe");
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
          setProgress(0.94);
          setStatus("Building the visual cooking flow");
          await wait(280);
          onImport(reconstructed.recipe, notice, true);
          setProgress(1);
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
      setProgress(0.94);
      setStatus("Building the local visual flow");
      await wait(240);
      onImport(
        localRecipe,
        "Tesseract created a local approximation. Review quantities and steps, then use Edit for any corrections."
      );
      setProgress(1);
      setStatus("Local approximation ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The image could not be read.");
    } finally {
      setBusy(false);
    }
  }

  async function importText(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    if (text.trim().length < 30) {
      setError("Paste the recipe title, ingredients, and directions first.");
      return;
    }
    setBusy(true);
    setProgress(0.28);
    setStatus("Structuring ingredients and directions");
    await wait(220);
    setProgress(0.66);
    setStatus("Mapping ingredients to cooking stages");
    await wait(220);
    setProgress(0.94);
    setStatus("Building the visual cooking flow");
    await wait(220);
    onImport(parseRecipeText(text, { siteName: "Pasted recipe" }));
    setProgress(1);
    setStatus("Recipe ready");
    setBusy(false);
  }

  async function runSampleDemo() {
    if (busy) return;
    resetFeedback();
    document.querySelector(".import-card")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    setDemoRunning(true);
    setBusy(true);
    const moments = [
      ["Reading a messy recipe source", 0.12],
      ["Separating ingredients from the noise", 0.34],
      ["Mapping ingredients to cooking stages", 0.65],
      ["Rendering the visual recipe", 0.94]
    ] as const;

    for (const [message, nextProgress] of moments) {
      setStatus(message);
      setProgress(nextProgress);
      await wait(430);
    }

    onImport(
      SAMPLE_RECIPE,
      "Demo complete—RecipeTable extracted the recipe and compiled its full cooking flow."
    );
    setProgress(1);
    setStatus("Visual recipe ready");
    setBusy(false);
    setDemoRunning(false);
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
          onClick={runSampleDemo}
          disabled={busy}
        >
          {demoRunning ? "Building the demo…" : "Run the 15-second demo"}
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
          <button className="primary-button full" type="submit" disabled={busy}>
            {busy ? status || "Building table…" : "Make table"}
            <Icon name="arrow" size={18} />
          </button>
        </form>
      )}

      {busy && (
        <section className="intelligence-pipeline" aria-label="Recipe processing progress">
          <header>
            <span className="pipeline-orb"><Icon name="sparkle" size={17} /></span>
            <div>
              <strong>{status || "Understanding your recipe"}</strong>
              <span>RecipeTable intelligence pipeline</span>
            </div>
            <b>{Math.round(Math.max(progress, 0.08) * 100)}%</b>
          </header>
          <ol>
            {pipelinePhases.map((phase, index) => (
              <li
                key={phase}
                className={
                  index < pipelineIndex ? "complete" :
                  index === pipelineIndex ? "active" : ""
                }
              >
                <span>{index < pipelineIndex ? <Icon name="check" size={13} /> : index + 1}</span>
                {phase}
              </li>
            ))}
          </ol>
          <div className="pipeline-track" aria-hidden="true">
            <span style={{ width: `${Math.max(progress * 100, 8)}%` }} />
          </div>
        </section>
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


function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
