import { Icon } from "./Icon";

const references = [
  {
    label: "Tesseract.js",
    detail: "Local OCR",
    href: "https://github.com/naptha/tesseract.js"
  },
  {
    label: "Schema.org Recipe",
    detail: "Structured extraction",
    href: "https://schema.org/Recipe"
  },
  {
    label: "Qwen3 30B-A3B",
    detail: "Cloudflare model",
    href: "https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/"
  },
  {
    label: "Workers AI pricing",
    detail: "Live rates",
    href: "https://developers.cloudflare.com/workers-ai/platform/pricing/"
  }
] as const;

export function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works" aria-labelledby="how-title">
      <div className="how-intro">
        <span className="eyebrow">Under the hood</span>
        <h2 id="how-title">Most of the work isn’t AI. That’s the trick.</h2>
        <p>
          Recipe Wizard uses deterministic code whenever the answer is knowable,
          then calls a right-sized open model only when the source is genuinely
          ambiguous. It is faster, more private, and radically cheaper than
          sending every page and photo to a frontier multimodal API.
        </p>
        <div className="how-principle">
          <Icon name="sparkle" size={18} />
          <span>
            <strong>Our rule:</strong> use code for facts, AI for ambiguity, and
            always keep the result editable.
          </span>
        </div>
        <a className="how-jump-link" href="#cost-by-design">
          See the real operating cost
          <Icon name="arrow" size={16} />
        </a>
      </div>

      <div className="how-body">
        <div className="pipeline-card">
          <div className="pipeline-header">
            <div>
              <span>One import, four specialized layers</span>
              <strong>The smallest capable tool does each job.</strong>
            </div>
            <span className="pipeline-live"><i /> Live architecture</span>
          </div>

          <div className="pipeline-grid">
            <article>
              <span className="pipeline-step">01</span>
              <div className="pipeline-icon"><Icon name="link" size={21} /></div>
              <span className="pipeline-location">Cloudflare edge</span>
              <h3>Extract the facts</h3>
              <p>
                For a URL, the Worker fetches the page and looks for its
                Schema.org recipe card. Title, ingredients, steps, timing, and
                yield are parsed without spending a single AI token.
              </p>
              <span className="pipeline-cost">AI cost: $0</span>
            </article>

            <article>
              <span className="pipeline-step">02</span>
              <div className="pipeline-icon"><Icon name="scan" size={21} /></div>
              <span className="pipeline-location local">Your device</span>
              <h3>Read the pixels locally</h3>
              <p>
                For photos and screenshots, Tesseract WebAssembly runs inside
                the browser. The original image stays on the device; only its
                extracted text can move to the cleanup stage.
              </p>
              <span className="pipeline-cost">Image upload: never</span>
            </article>

            <article>
              <span className="pipeline-step">03</span>
              <div className="pipeline-icon"><Icon name="sparkle" size={21} /></div>
              <span className="pipeline-location">Workers AI</span>
              <h3>Repair only the ambiguity</h3>
              <p>
                Noisy OCR text is sent to Qwen3 30B-A3B with a strict JSON
                schema. It reconstructs a visible recipe or clearly labels a
                culinary approximation. Bad structure gets one repair pass.
              </p>
              <span className="pipeline-cost">Model: 3B active parameters</span>
            </article>

            <article>
              <span className="pipeline-step">04</span>
              <div className="pipeline-icon"><Icon name="check" size={21} /></div>
              <span className="pipeline-location local">Your device</span>
              <h3>Compile, don’t hallucinate</h3>
              <p>
                A deterministic graph links ingredients to cooking stages,
                validates omissions, and lays out the visual map. The model does
                not get the final word; code does.
              </p>
              <span className="pipeline-cost">Output: editable + validated</span>
            </article>
          </div>
        </div>

        <div className="privacy-boundary">
          <div>
            <span className="boundary-label">Stays on your device</span>
            <strong>Photo · browser library · visual compiler</strong>
          </div>
          <span className="boundary-gate">
            <Icon name="shield" size={19} />
            Text only
          </span>
          <div>
            <span className="boundary-label">Runs at Cloudflare’s edge</span>
            <strong>URL extraction · optional OCR cleanup</strong>
          </div>
        </div>

        <section className="cost-card" id="cost-by-design" aria-labelledby="cost-title">
          <div className="cost-copy">
            <span className="eyebrow">Cost by design</span>
            <h3 id="cost-title">A 30B model for fractions of a cent.</h3>
            <p>
              The Qwen mixture-of-experts model has 30 billion total parameters
              but activates roughly 3 billion for each token. Cloudflare lists
              it at <strong>$0.051 per million input tokens</strong> and{" "}
              <strong>$0.335 per million output tokens</strong>, with 10,000
              Neurons of free usage every day.
            </p>
            <p className="cost-note">
              A normal recipe cleanup is typically well below one tenth of a
              cent. We also avoid image-token charges because Tesseract reads the
              pixels locally.
            </p>
          </div>

          <div className="cost-comparison" aria-label="Output token price comparison">
            <div className="cost-row qwen">
              <span>Recipe Wizard · Qwen3</span>
              <div><i /></div>
              <strong>$0.335</strong>
            </div>
            <div className="cost-row gpt">
              <span>GPT-5.6 Luna</span>
              <div><i /></div>
              <strong>$1.20</strong>
            </div>
            <div className="cost-row gemini">
              <span>Gemini 3.6 Flash</span>
              <div><i /></div>
              <strong>$7.50</strong>
            </div>
            <p>
              Published standard output pricing per 1M tokens, checked August
              2026. This is a cost comparison, not a general capability ranking.
              Recipe Wizard uses the model for a narrow structured task.
            </p>
          </div>
        </section>

        <div className="how-references">
          <div>
            <span className="eyebrow">Inspect the stack</span>
            <strong>No mystery box.</strong>
          </div>
          <div>
            {references.map((reference) => (
              <a
                key={reference.label}
                href={reference.href}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>{reference.label}</strong>
                  <small>{reference.detail}</small>
                </span>
                <Icon name="arrow" size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
