import { useState, type FormEvent } from "react";
import { recipeFromParts } from "../lib/parseRecipeText";
import type { Recipe } from "../types";
import { Icon } from "./Icon";

interface RecipeEditorProps {
  recipe: Recipe;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

export function RecipeEditor({ recipe, onClose, onSave }: RecipeEditorProps) {
  const [title, setTitle] = useState(recipe.title);
  const [yieldValue, setYieldValue] = useState(recipe.yield ?? "");
  const [ingredients, setIngredients] = useState(
    recipe.ingredients.map((ingredient) => ingredient.raw).join("\n")
  );
  const [steps, setSteps] = useState(
    recipe.steps.map((step) => step.raw).join("\n")
  );

  function save(event: FormEvent) {
    event.preventDefault();
    const next = recipeFromParts({
      title,
      yield: yieldValue,
      description: recipe.description,
      ingredientLines: ingredients.split("\n"),
      instructionLines: steps.split("\n"),
      source: recipe.source,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime
    });
    onSave({ ...next, id: recipe.id });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Review the source</span>
            <h2 id="editor-title">Edit recipe</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <form className="editor-form" onSubmit={save}>
          <div className="editor-row">
            <label>
              Recipe title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Yield
              <input
                value={yieldValue}
                onChange={(event) => setYieldValue(event.target.value)}
                placeholder="Serves 4"
              />
            </label>
          </div>
          <label>
            Ingredients
            <span className="label-hint">One ingredient per line</span>
            <textarea
              rows={10}
              value={ingredients}
              onChange={(event) => setIngredients(event.target.value)}
            />
          </label>
          <label>
            Directions
            <span className="label-hint">One action per line</span>
            <textarea
              rows={10}
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
            />
          </label>
          <div className="editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              <Icon name="check" size={18} />
              Update table
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

