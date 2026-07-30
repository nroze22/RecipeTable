import { useEffect, useMemo, useState } from "react";
import type { CompiledRecipe } from "../types";
import { Icon } from "./Icon";

interface CookingModeProps {
  compiled: CompiledRecipe;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function CookingMode({ compiled, onClose }: CookingModeProps) {
  const [index, setIndex] = useState(0);
  const action = compiled.actions[index];
  const [timeLeft, setTimeLeft] = useState(action?.durationSeconds ?? 0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setTimeLeft(action?.durationSeconds ?? 0);
    setRunning(false);
  }, [action]);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, timeLeft]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(compiled.actions.length - 1, current + 1));
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [compiled.actions.length, onClose]);

  const ingredients = useMemo(() => {
    if (!action) return [];
    const direct = compiled.orderedIngredients.filter((ingredient) =>
      action.ingredientIds.includes(ingredient.id)
    );
    if (direct.length) return direct;
    return compiled.orderedIngredients.slice(
      action.ingredientRowStart,
      action.ingredientRowEnd + 1
    );
  }, [action, compiled.orderedIngredients]);

  if (!action) return null;

  return (
    <section className="cook-mode" role="dialog" aria-modal="true" aria-label="Cooking mode">
      <header className="cook-header">
        <div className="brand-lockup light">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>RecipeTable</span>
        </div>
        <span className="cook-progress">
          {index + 1} of {compiled.actions.length}
        </span>
        <button className="icon-button light" type="button" onClick={onClose} aria-label="Exit cooking mode">
          <Icon name="close" />
        </button>
      </header>

      <div className="cook-content">
        <div className="cook-stage">
          <span>Stage {index + 1}</span>
          <h2>{action.label}</h2>
          <p>{action.instruction}</p>
        </div>

        {ingredients.length > 0 && (
          <div className="cook-ingredients">
            <span className="eyebrow light-eyebrow">What you need now</span>
            <ul>
              {ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <Icon name="check" size={19} />
                  {ingredient.raw}
                </li>
              ))}
            </ul>
          </div>
        )}

        {action.durationSeconds && (
          <button
            className={running ? "cook-timer running" : "cook-timer"}
            type="button"
            onClick={() => setRunning((value) => !value)}
          >
            <Icon name="timer" size={23} />
            <span>{formatTime(timeLeft)}</span>
            <small>{running ? "Tap to pause" : "Start timer"}</small>
          </button>
        )}
      </div>

      <footer className="cook-navigation">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          <Icon name="chevronLeft" />
          Previous
        </button>
        <div className="cook-dots" aria-hidden="true">
          {compiled.actions.map((candidate, candidateIndex) => (
            <span
              key={candidate.id}
              className={candidateIndex === index ? "active" : ""}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            index === compiled.actions.length - 1
              ? onClose()
              : setIndex((value) => value + 1)
          }
        >
          {index === compiled.actions.length - 1 ? "Finish" : "Next"}
          <Icon name={index === compiled.actions.length - 1 ? "check" : "chevronRight"} />
        </button>
      </footer>
    </section>
  );
}

