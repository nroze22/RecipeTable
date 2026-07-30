import type { CompiledRecipe } from "../types";
import { Icon } from "./Icon";

interface RecipeFlowProps {
  compiled: CompiledRecipe;
}

export function RecipeFlow({ compiled }: RecipeFlowProps) {
  const { recipe, orderedIngredients, actions, setupSteps } = compiled;
  const gridColumns = `minmax(250px, 1.7fr) repeat(${Math.max(actions.length, 1)}, minmax(132px, 1fr))`;

  return (
    <article className="recipe-sheet">
      <header className="sheet-header">
        <div>
          <span className="sheet-kicker">Recipe flow</span>
          <h2>{recipe.title}</h2>
          {recipe.description && <p>{recipe.description}</p>}
        </div>
        <div className="recipe-facts">
          {recipe.yield && <span>{recipe.yield}</span>}
          {(recipe.totalTime || recipe.cookTime) && (
            <span>
              <Icon name="timer" size={16} />
              {recipe.totalTime || recipe.cookTime}
            </span>
          )}
        </div>
      </header>

      {setupSteps.length > 0 && (
        <div className="setup-list">
          {setupSteps.map((step, index) => (
            <div className="setup-step" key={step.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step.raw}
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && orderedIngredients.length > 0 ? (
        <div className="flow-scroll" tabIndex={0}>
          <div
            className="flow-grid"
            style={{
              gridTemplateColumns: gridColumns,
              gridTemplateRows: `48px repeat(${orderedIngredients.length}, minmax(58px, auto))`
            }}
          >
            <div className="flow-corner">Ingredients, in order</div>
            {actions.map((action, actionIndex) => (
              <div
                className="stage-heading"
                key={`heading-${action.id}`}
                style={{ gridColumn: actionIndex + 2, gridRow: 1 }}
              >
                <span>Stage {actionIndex + 1}</span>
              </div>
            ))}

            {orderedIngredients.map((ingredient, rowIndex) => (
              <div
                className="ingredient-cell"
                key={ingredient.id}
                style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
              >
                <span className="ingredient-index">
                  {String(rowIndex + 1).padStart(2, "0")}
                </span>
                <span>{ingredient.raw}</span>
              </div>
            ))}

            {actions.flatMap((action, actionIndex) =>
              orderedIngredients.map((ingredient, rowIndex) => (
                <div
                  aria-hidden="true"
                  className="flow-gridline"
                  key={`${action.id}-${ingredient.id}-line`}
                  style={{
                    gridColumn: actionIndex + 2,
                    gridRow: rowIndex + 2
                  }}
                />
              ))
            )}

            {actions.map((action, actionIndex) => (
              <div
                className={`action-cell tone-${actionIndex % 4}`}
                key={action.id}
                style={{
                  gridColumn: actionIndex + 2,
                  gridRow: `${action.ingredientRowStart + 2} / ${action.ingredientRowEnd + 3}`
                }}
                title={action.instruction}
              >
                <span className="action-number">{actionIndex + 1}</span>
                <strong>{action.label}</strong>
                {(action.temperature || action.duration) && (
                  <span className="action-meta">
                    {[action.temperature, action.duration].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-flow">
          <Icon name="edit" size={28} />
          <strong>This recipe needs a quick review.</strong>
          <span>Add at least one ingredient and one direction.</span>
        </div>
      )}

      <ol className="accessible-directions">
        {recipe.steps.map((step) => (
          <li key={step.id}>{step.raw}</li>
        ))}
      </ol>

      <footer className="sheet-footer">
        <div className="mini-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>Made clear by RecipeTable</span>
        {recipe.source?.url ? (
          <a href={recipe.source.url} target="_blank" rel="noreferrer">
            Original recipe
            <Icon name="arrow" size={15} />
          </a>
        ) : (
          <span>{recipe.source?.siteName || "Personal recipe"}</span>
        )}
      </footer>
    </article>
  );
}

