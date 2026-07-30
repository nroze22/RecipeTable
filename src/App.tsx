import { useEffect, useMemo, useRef, useState } from "react";
import { CookingMode } from "./components/CookingMode";
import { Icon } from "./components/Icon";
import { ImportPanel } from "./components/ImportPanel";
import { RecipeEditor } from "./components/RecipeEditor";
import { RecipeFlow } from "./components/RecipeFlow";
import { SAMPLE_RECIPE } from "./data/sample";
import { copyRecipeTable, downloadRecipePng } from "./lib/exportRecipe";
import { compileRecipe } from "./lib/recipeGraph";
import { loadRecentRecipes, saveRecentRecipe } from "./lib/storage";
import {
  isWorkerConfigured,
  refineRecipeLinks
} from "./lib/workerClient";
import type { IngredientStepLink, Recipe } from "./types";

export default function App() {
  const [recipe, setRecipe] = useState<Recipe>(
    () => loadRecentRecipes()[0] ?? SAMPLE_RECIPE
  );
  const [linkPlan, setLinkPlan] = useState<IngredientStepLink[]>([]);
  const [editing, setEditing] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineMessage, setRefineMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const compiled = useMemo(
    () => compileRecipe(recipe, linkPlan),
    [recipe, linkPlan]
  );

  useEffect(() => {
    if (
      import.meta.env.VITE_ENABLE_AI_COMPILER === "true" &&
      isWorkerConfigured() &&
      recipe !== SAMPLE_RECIPE
    ) {
      void refine();
    }
    // The recipe identity intentionally controls this one-shot refinement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  function acceptRecipe(next: Recipe) {
    setRecipe(next);
    setLinkPlan([]);
    setRefineMessage("");
    saveRecentRecipe(next);
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function refine() {
    if (!isWorkerConfigured()) {
      setRefineMessage("Deploy and connect the Worker to enable Smart Map.");
      return;
    }
    setRefining(true);
    setRefineMessage("");
    try {
      const plan = await refineRecipeLinks(recipe);
      setLinkPlan(plan);
      setRefineMessage("Ingredient flow refined");
    } catch (reason) {
      setRefineMessage(
        reason instanceof Error
          ? reason.message
          : "Smart Map was unavailable; the local mapping is still active."
      );
    } finally {
      setRefining(false);
    }
  }

  async function copyTable() {
    try {
      await copyRecipeTable(compiled);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setRefineMessage("Your browser blocked clipboard access.");
    }
  }

  async function exportPng() {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await downloadRecipePng(sheetRef.current, recipe.title);
    } catch {
      setRefineMessage("The image export failed. Try Print instead.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="RecipeTable home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>RecipeTable</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <span className="local-pill">
            <Icon name="shield" size={15} />
            Local by default
          </span>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow">
              <Icon name="sparkle" size={16} />
              A calmer way to cook
            </span>
            <h1>
              Recipes that
              <em> show their work.</em>
            </h1>
            <p>
              Turn cluttered recipe pages, cookbook photos, and family notes into
              one clear visual flow—ingredients, actions, timing, all together.
            </p>
            <div className="hero-proof">
              <div>
                <strong>Zero</strong>
                <span>accounts or uploads</span>
              </div>
              <div>
                <strong>One</strong>
                <span>glance while cooking</span>
              </div>
              <div>
                <strong>Any</strong>
                <span>recipe source</span>
              </div>
            </div>
          </div>
          <div className="hero-demo" aria-hidden="true">
            <div className="demo-title">
              <span>Weeknight tomato pasta</span>
              <small>4 servings · 25 min</small>
            </div>
            <div className="demo-grid">
              <span>12 oz spaghetti</span>
              <b className="demo-action a">Boil</b>
              <b className="demo-action c">Toss</b>
              <span>2 tbsp olive oil</span>
              <b className="demo-action b">Warm</b>
              <span>3 garlic cloves</span>
              <span>2 cups tomatoes</span>
              <b className="demo-action d">Simmer</b>
              <b className="demo-action e">Finish</b>
              <span>½ cup parmesan</span>
            </div>
            <div className="demo-caption">
              <span className="live-dot" />
              Ingredient flow, generated automatically
            </div>
          </div>
        </section>

        <ImportPanel onImport={acceptRecipe} />

        <section className="result-section" ref={resultRef} aria-labelledby="result-title">
          <div className="result-heading">
            <div>
              <span className="eyebrow">Your visual recipe</span>
              <h2 id="result-title">One table. No tab switching.</h2>
            </div>
            <div className="result-actions">
              <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
                <Icon name="edit" size={17} />
                Edit
              </button>
              <button
                className="secondary-button smart-button"
                type="button"
                onClick={refine}
                disabled={refining}
                title="Use the optional open model to improve ingredient-to-step mapping"
              >
                <Icon name="sparkle" size={17} />
                {refining ? "Mapping…" : "Smart Map"}
              </button>
              <button className="secondary-button" type="button" onClick={copyTable}>
                <Icon name={copied ? "check" : "copy"} size={17} />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={exportPng}
                disabled={exporting}
              >
                <Icon name="download" size={17} />
                {exporting ? "Exporting…" : "PNG"}
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => setCooking(true)}
                disabled={!compiled.actions.length}
              >
                <Icon name="play" size={17} />
                Cook
              </button>
            </div>
          </div>

          {(refineMessage || compiled.warnings.length > 0) && (
            <div className="result-messages" aria-live="polite">
              {refineMessage && <span>{refineMessage}</span>}
              {compiled.warnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          )}

          <div ref={sheetRef}>
            <RecipeFlow compiled={compiled} />
          </div>
          <p className="scroll-hint">
            <Icon name="arrow" size={16} />
            On smaller screens, swipe the table to move through stages.
          </p>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-intro">
            <span className="eyebrow">Built for the messy real world</span>
            <h2>The intelligence stays out of your way.</h2>
            <p>
              RecipeTable uses structured recipe data first, private browser OCR
              second, and an open model only when the ingredient flow is genuinely
              ambiguous.
            </p>
          </div>
          <div className="how-grid">
            <article>
              <span className="how-number">01</span>
              <Icon name="link" size={24} />
              <h3>Extract, don’t summarize</h3>
              <p>
                Pull the actual recipe card from the page while leaving essays,
                ads, trackers, and pop-ups behind.
              </p>
            </article>
            <article>
              <span className="how-number">02</span>
              <Icon name="scan" size={24} />
              <h3>Read photos privately</h3>
              <p>
                Tesseract runs on your device. Cookbook pages and screenshots
                never leave the browser.
              </p>
            </article>
            <article>
              <span className="how-number">03</span>
              <Icon name="sparkle" size={24} />
              <h3>Compile the cooking flow</h3>
              <p>
                Ingredients are linked to actions, checked for omissions, and
                arranged into a timeline you can actually use.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>RecipeTable</span>
        </div>
        <p>Recipes made clear. Your kitchen, your data.</p>
        <span>Built with open tools.</span>
      </footer>

      {editing && (
        <RecipeEditor
          recipe={recipe}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            acceptRecipe(next);
            setEditing(false);
          }}
        />
      )}
      {cooking && <CookingMode compiled={compiled} onClose={() => setCooking(false)} />}
    </div>
  );
}

