import type { Recipe } from "../types";
import { Icon } from "./Icon";

interface RecipeRevealProps {
  recipe: Recipe;
  onSkip: () => void;
}

export function RecipeReveal({ recipe, onSkip }: RecipeRevealProps) {
  const ingredients = recipe.ingredients.slice(0, 5);
  const steps = recipe.steps.filter((step) => !step.isSetup).slice(0, 4);

  return (
    <div className="recipe-reveal" role="status" aria-live="polite">
      <div className="reveal-glow" />
      <button type="button" onClick={onSkip}>Skip animation</button>
      <div className="reveal-stage">
        <div className="reveal-source">
          <span className="reveal-kicker">Source understood</span>
          <div className="reveal-paper">
            <i />
            <strong>{recipe.title}</strong>
            {ingredients.map((ingredient, index) => (
              <span key={ingredient.id} style={{ "--line": index } as React.CSSProperties}>
                {ingredient.raw}
              </span>
            ))}
          </div>
        </div>

        <div className="reveal-core" aria-hidden="true">
          <span><Icon name="sparkle" size={24} /></span>
          <small>Compiling cooking logic</small>
        </div>

        <div className="reveal-result">
          <span className="reveal-kicker">Visual recipe ready</span>
          <div className="reveal-map">
            <header>
              <strong>{recipe.title}</strong>
              <Icon name="check" size={17} />
            </header>
            <div>
              {ingredients.map((ingredient) => <span key={ingredient.id}>{ingredient.name}</span>)}
              {steps.map((step, index) => (
                <b
                  key={step.id}
                  className={`reveal-action reveal-action-${index + 1}`}
                >
                  {step.raw.split(/[,.;]/)[0].split(" ").slice(0, 2).join(" ")}
                </b>
              ))}
            </div>
          </div>
        </div>
      </div>
      <footer>
        <span><i /> Extracted</span>
        <span><i /> Organized</span>
        <span><i /> Ready to cook</span>
      </footer>
    </div>
  );
}
