import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

const FIRST_RUN_KEY = "recipe-table:first-run-v1";

interface FirstRunExperienceProps {
  onStart: () => void;
  onSample: () => void;
}

const slides = [
  {
    eyebrow: "Welcome to RecipeTable",
    title: "From recipe chaos to one cooking map.",
    body:
      "Paste a link, photograph a cookbook page, or drop in a screenshot. RecipeTable finds the actual cooking logic and redraws it as one calm visual flow."
  },
  {
    eyebrow: "Designed around the way you cook",
    title: "See what happens—and when.",
    body:
      "Ingredients line up with the exact stage where they enter. Setup, mixing, timing, temperature, and finishing steps stay visible without rereading paragraphs."
  },
  {
    eyebrow: "Local-first intelligence",
    title: "Your kitchen. Your recipes. Your data.",
    body:
      "Images are read on your device. Only extracted text is sent for AI cleanup when needed, and your recipe library stays inside this browser."
  }
] as const;

export function FirstRunExperience({
  onStart,
  onSample
}: FirstRunExperienceProps) {
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(FIRST_RUN_KEY) !== "complete"
  );
  const [step, setStep] = useState(0);
  const nextButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nextButton.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight" && step < slides.length - 1) {
        setStep((value) => value + 1);
      }
      if (event.key === "ArrowLeft" && step > 0) {
        setStep((value) => value - 1);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [visible, step]);

  function finish(action?: () => void) {
    window.localStorage.setItem(FIRST_RUN_KEY, "complete");
    setVisible(false);
    window.setTimeout(() => action?.(), 40);
  }

  if (!visible) return null;

  const slide = slides[step];

  return (
    <div className="onboarding-backdrop">
      <section
        className="onboarding-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <header className="onboarding-header">
          <span className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>RecipeTable</span>
          </span>
          <button className="onboarding-skip" type="button" onClick={() => finish()}>
            Skip introduction
          </button>
        </header>

        <div className="onboarding-content" key={step}>
          <div className="onboarding-copy">
            <span className="eyebrow">{slide.eyebrow}</span>
            <h1 id="onboarding-title">{slide.title}</h1>
            <p>{slide.body}</p>
          </div>

          {step === 0 && (
            <div className="onboarding-transform" aria-hidden="true">
              <div className="source-stack">
                <span className="source-card source-link">
                  <Icon name="link" size={16} />
                  Recipe URL
                </span>
                <span className="source-card source-photo">
                  <Icon name="camera" size={16} />
                  Cookbook photo
                </span>
                <span className="source-card source-text">
                  <Icon name="text" size={16} />
                  Family note
                </span>
              </div>
              <div className="transform-core">
                <span />
                <Icon name="sparkle" size={22} />
              </div>
              <div className="onboarding-map">
                <div className="map-title">
                  <strong>One visual recipe</strong>
                  <span>Ready to cook</span>
                </div>
                <div className="map-grid">
                  <span>Flour</span><b className="map-a">Whisk</b>
                  <span>Butter</span><b className="map-b">Cream</b>
                  <span>Eggs</span><b className="map-c">Mix</b>
                  <span>Vanilla</span><b className="map-d">Bake</b>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="onboarding-feature-grid">
              <article>
                <span>01</span>
                <Icon name="scan" size={23} />
                <strong>Extract</strong>
                <p>Pull out ingredients and directions—not ads and essays.</p>
              </article>
              <article>
                <span>02</span>
                <Icon name="sparkle" size={23} />
                <strong>Organize</strong>
                <p>Group ingredients into the real sequence of cooking actions.</p>
              </article>
              <article>
                <span>03</span>
                <Icon name="play" size={23} />
                <strong>Cook</strong>
                <p>Scan the whole recipe or move through one focused step at a time.</p>
              </article>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-privacy">
              <div className="privacy-orbit">
                <span className="privacy-shield">
                  <Icon name="shield" size={32} />
                </span>
                <i className="orbit-dot dot-one" />
                <i className="orbit-dot dot-two" />
              </div>
              <div>
                <strong>Private by default</strong>
                <ul>
                  <li><Icon name="check" size={16} /> Photos stay on your device</li>
                  <li><Icon name="check" size={16} /> No account or cloud recipe database</li>
                  <li><Icon name="check" size={16} /> Every AI approximation stays editable</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <footer className="onboarding-footer">
          <button
            className="onboarding-back"
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
          >
            <Icon name="chevronLeft" size={16} />
            Back
          </button>

          <div className="onboarding-dots" aria-label={`Step ${step + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={index === step ? "active" : ""}
                aria-label={`Go to step ${index + 1}`}
                onClick={() => setStep(index)}
              />
            ))}
          </div>

          {step < slides.length - 1 ? (
            <button
              ref={nextButton}
              className="primary-button onboarding-next"
              type="button"
              onClick={() => setStep((value) => value + 1)}
            >
              Continue
              <Icon name="arrow" size={17} />
            </button>
          ) : (
            <div className="onboarding-final-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => finish(onSample)}
              >
                See the sample
              </button>
              <button
                ref={nextButton}
                className="primary-button"
                type="button"
                onClick={() => finish(onStart)}
              >
                Create my first recipe
                <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}
