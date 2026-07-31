import { useEffect, useRef, useState } from "react";
import { createRecipeShareUrl } from "../lib/shareRecipe";
import type { Recipe } from "../types";
import { qrcodegen } from "../vendor/qrcodegen";
import { Icon } from "./Icon";

interface ShareRecipeDialogProps {
  recipe: Recipe;
  onClose: () => void;
}

function drawQr(canvas: HTMLCanvasElement, value: string): void {
  const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.LOW);
  const border = 4;
  const scale = Math.max(2, Math.floor(280 / (qr.size + border * 2)));
  const size = (qr.size + border * 2) * scale;
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.width = size;
  canvas.height = size;
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#17372f";
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) {
        context.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
      }
    }
  }
}

export function ShareRecipeDialog({ recipe, onClose }: ShareRecipeDialogProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrAvailable, setQrAvailable] = useState(true);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    void createRecipeShareUrl(recipe)
      .then((next) => {
        if (!active) return;
        setUrl(next);
      })
      .catch(() => {
        if (active) setError("A private share link could not be created for this recipe.");
      });
    return () => {
      active = false;
    };
  }, [recipe]);

  useEffect(() => {
    if (!url || !canvas.current) return;
    try {
      drawQr(canvas.current, url);
    } catch {
      setQrAvailable(false);
    }
  }, [url]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Your browser blocked clipboard access.");
    }
  }

  async function nativeShare() {
    if (!url || !navigator.share) return;
    try {
      await navigator.share({
        title: recipe.title,
        text: `${recipe.title} — a visual recipe from RecipeTable`,
        url
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("Sharing was unavailable. Copy the private link instead.");
    }
  }

  return (
    <div className="share-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">No account required</span>
            <h2 id="share-title">Share this visual recipe</h2>
          </div>
          <button className="share-close" type="button" onClick={onClose} aria-label="Close sharing">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="share-body">
          <div className={qrAvailable ? "share-qr" : "share-qr unavailable"}>
            {url && qrAvailable ? (
              <canvas ref={canvas} aria-label={`QR code for ${recipe.title}`} />
            ) : (
              <span>{qrAvailable ? "Creating private QR…" : "Recipe too detailed for a QR code"}</span>
            )}
          </div>
          <div className="share-copy">
            <span className="share-private-pill">
              <Icon name="shield" size={15} />
              Recipe lives inside the link
            </span>
            <h3>{recipe.title}</h3>
            <p>
              The ingredients and steps are compressed into this URL. There is no
              RecipeTable account, public listing, or cloud recipe record.
            </p>
            <label htmlFor="share-url">Private recipe link</label>
            <div className="share-url-row">
              <input id="share-url" value={url || "Building link…"} readOnly />
              <button type="button" onClick={copyLink} disabled={!url}>
                <Icon name={copied ? "check" : "copy"} size={17} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="share-actions">
              {typeof navigator.share === "function" && (
                <button className="primary-button" type="button" onClick={nativeShare} disabled={!url}>
                  <Icon name="share" size={17} />
                  Share from this device
                </button>
              )}
              <button className="secondary-button" type="button" onClick={onClose}>
                Done
              </button>
            </div>
            {error && <p className="share-error">{error}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
