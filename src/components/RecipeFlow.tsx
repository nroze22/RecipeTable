import { useRef, useState, type UIEvent } from "react";
import type { CompiledRecipe } from "../types";
import { Icon } from "./Icon";

interface RecipeFlowProps {
  compiled: CompiledRecipe;
}

export function RecipeFlow({ compiled }: RecipeFlowProps) {
  const { recipe, orderedIngredients, actions, setupSteps } = compiled;
  const [activeStage, setActiveStage] = useState(0);
  const mobileRail = useRef<HTMLDivElement>(null);
  const gridColumns = `minmax(250px, 1.7fr) repeat(${Math.max(actions.length, 1)}, minmax(132px, 1fr))`;
  const ingredientById = new Map(
    orderedIngredients.map((ingredient) => [ingredient.id, ingredient])
  );

  function goToStage(index: number) {
    const safeIndex = Math.max(0, Math.min(actions.length - 1, index));
    const rail = mobileRail.current;
    const card = rail?.querySelectorAll<HTMLElement>(".mobile-stage-card")[safeIndex];
    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start"
    });
    setActiveStage(safeIndex);
  }

  function trackActiveStage(event: UIEvent<HTMLDivElement>) {
    const rail = event.currentTarget;
    const cards = [...rail.querySelectorAll<HTMLElement>(".mobile-stage-card")];
    if (!cards.length) return;
    const closest = cards.reduce(
      (best, card, index) => {
        const distance = Math.abs(card.offsetLeft - rail.scrollLeft);
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY }
    );
    setActiveStage(closest.index);
  }

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
        <>
          <div className="flow-scroll desktop-flow" tabIndex={0}>
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

          <div className="mobile-flow">
            <details className="mobile-ingredient-drawer">
              <summary>
                <span>
                  <span className="sheet-kicker">Ingredient lineup</span>
                  <strong>{orderedIngredients.length} ingredients</strong>
                </span>
                <Icon name="chevronRight" size={18} />
              </summary>
              <ol>
                {orderedIngredients.map((ingredient, index) => (
                  <li key={ingredient.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {ingredient.raw}
                  </li>
                ))}
              </ol>
            </details>

            <div className="mobile-flow-heading">
              <div>
                <span className="sheet-kicker">Cooking flow</span>
                <strong>Swipe through each stage</strong>
              </div>
              <span className="mobile-stage-count">
                {activeStage + 1} / {actions.length}
              </span>
            </div>

            <div
              className="mobile-stage-rail"
              ref={mobileRail}
              onScroll={trackActiveStage}
              tabIndex={0}
              aria-label="Recipe stages"
            >
              {actions.map((action, actionIndex) => {
                const directIngredients = action.ingredientIds
                  .map((id) => ingredientById.get(id))
                  .filter((ingredient) => ingredient !== undefined);
                return (
                  <article
                    className={`mobile-stage-card tone-${actionIndex % 4}`}
                    key={action.id}
                    aria-label={`Stage ${actionIndex + 1}: ${action.label}`}
                  >
                    <header>
                      <span className="mobile-stage-number">
                        {String(actionIndex + 1).padStart(2, "0")}
                      </span>
                      <span>Stage {actionIndex + 1}</span>
                    </header>
                    <h3>{action.label}</h3>
                    {(action.temperature || action.duration) && (
                      <div className="mobile-stage-meta">
                        {action.temperature && <span>{action.temperature}</span>}
                        {action.duration && (
                          <span>
                            <Icon name="timer" size={14} />
                            {action.duration}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mobile-stage-instruction">{action.instruction}</p>
                    <div className="mobile-add-now">
                      <span className="mobile-add-label">
                        {directIngredients.length > 0 ? "Add now" : "Working mixture"}
                      </span>
                      {directIngredients.length > 0 ? (
                        <ul>
                          {directIngredients.map((ingredient) => (
                            <li key={ingredient.id}>
                              <Icon name="check" size={15} />
                              {ingredient.raw}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Continue with the combined ingredients from the previous stage.</p>
                      )}
                    </div>
                  </article>
                );
              })}
              <span className="mobile-rail-spacer" aria-hidden="true" />
            </div>

            <div className="mobile-flow-controls">
              <button
                type="button"
                onClick={() => goToStage(activeStage - 1)}
                disabled={activeStage === 0}
                aria-label="Previous stage"
              >
                <Icon name="chevronLeft" size={18} />
              </button>
              <div className="mobile-stage-dots" aria-label="Recipe stage progress">
                {actions.map((action, index) => (
                  <button
                    type="button"
                    key={action.id}
                    className={index === activeStage ? "active" : ""}
                    onClick={() => goToStage(index)}
                    aria-label={`Go to stage ${index + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goToStage(activeStage + 1)}
                disabled={activeStage === actions.length - 1}
                aria-label="Next stage"
              >
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          </div>
        </>
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
