import type { Recipe } from "../types";
import { Icon } from "./Icon";

interface RecipeLibraryProps {
  recipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
}

function recipeMeta(recipe: Recipe): string {
  const parts = [
    recipe.yield,
    recipe.totalTime || recipe.cookTime,
    `${recipe.ingredients.length} ingredients`
  ].filter(Boolean);
  return parts.join(" · ");
}

function importedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved locally";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

export function RecipeLibrary({
  recipes,
  onOpen,
  onDelete
}: RecipeLibraryProps) {
  return (
    <section className="library-section" id="library" aria-labelledby="library-title">
      <div className="library-heading">
        <div>
          <span className="eyebrow">Saved on this device</span>
          <h2 id="library-title">Your recipe library</h2>
          <p>
            Recipes stay in this browser—no account, cloud database, or tracking.
          </p>
        </div>
        <span className="library-count">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        </span>
      </div>

      {recipes.length === 0 ? (
        <div className="library-empty">
          <span className="drop-icon">
            <Icon name="image" size={24} />
          </span>
          <strong>Your saved recipes will appear here.</strong>
          <p>Import a URL, photo, or pasted recipe to start your private library.</p>
        </div>
      ) : (
        <div className="library-grid">
          {recipes.map((recipe) => (
            <article className="library-card" key={recipe.id}>
              <button
                className="library-card-main"
                type="button"
                onClick={() => onOpen(recipe)}
              >
                <span className="library-card-kicker">
                  {recipe.source?.siteName || "Saved recipe"}
                </span>
                <strong>{recipe.title}</strong>
                <span className="library-card-meta">{recipeMeta(recipe)}</span>
                <span className="library-card-date">{importedDate(recipe.importedAt)}</span>
              </button>
              <div className="library-card-actions">
                <button type="button" onClick={() => onOpen(recipe)}>
                  Open
                  <Icon name="arrow" size={15} />
                </button>
                <button
                  className="library-delete"
                  type="button"
                  aria-label={`Delete ${recipe.title} from this browser`}
                  onClick={() => onDelete(recipe.id)}
                >
                  <Icon name="close" size={15} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
