import { useRef } from "react";
import "./landing.css";

export function Landing() {
  const player = useRef<HTMLVideoElement>(null);
  function watch() {
    document
      .getElementById("demo-film")
      ?.scrollIntoView({ behavior: "smooth" });
    void player.current?.play().catch(() => undefined);
  }
  return (
    <div className="showcase">
      <header className="showcase-nav">
        <a className="showcase-wordmark" href="/">
          Altros <strong>Label Review</strong>
        </a>
        <nav aria-label="Product navigation">
          <a href="#workflow">The workflow</a>
          <a href="#demo-film">Watch demo</a>
          <a href="/workbench" className="site-button small">
            Open workbench
          </a>
        </nav>
      </header>
      <main className="showcase-main">
        <section className="showcase-hero">
          <div className="hero-copy">
            <p className="project-note">
              Built by Elijah Martin · Treasury take-home prototype
            </p>
            <h1>
              Every label has details.
              <br />
              Make the differences clear.
            </h1>
            <p className="hero-description">
              An alcohol label. An application. A review grounded in the
              evidence. AI reads the artwork; explicit comparison rules explain
              what agrees, what differs, and what needs a closer look.
            </p>
            <div className="hero-actions">
              <a className="site-button" href="/workbench">
                Try the workbench
              </a>
              <button className="site-play" onClick={watch}>
                <span aria-hidden="true">▶</span> Watch the walkthrough
              </button>
            </div>
            <p className="access-note">
              The fictional example is open to everyone. Live uploads use a
              reviewer access code.
            </p>
          </div>
          <figure className="hero-art">
            <div className="art-topline">
              <span className="art-dot" />
              <span>From artwork to evidence</span>
              <span className="art-status">Human review</span>
            </div>
            <img
              src="/media/workbench-preview.png"
              alt="Actual workbench showing a fictional label and application fields"
            />
            <figcaption>Actual interface. Fictional sample label.</figcaption>
          </figure>
        </section>
        <section id="workflow" className="workflow-story">
          <div>
            <p className="section-kicker">A focused review workflow</p>
            <h2>
              The question is simple.
              <br />
              Does the label agree?
            </h2>
            <p>
              Routine checks should be easy to follow. Start with the artwork
              and expected information, then inspect each finding with its
              reason and source text.
            </p>
          </div>
          <ol className="workflow-steps">
            <li>
              <span>1</span>
              <div>
                <h3>Supply the evidence</h3>
                <p>
                  Upload a JPEG or PNG and enter the application's brand, class,
                  alcohol content, net contents, producer and import origin.
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Read the differences</h3>
                <p>
                  Vision extraction and OCR feed field-specific comparisons.
                  Harmless case and apostrophe changes do not become brand
                  mismatches.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Make the human decision</h3>
                <p>
                  Inspect observed text, explanations and available highlights.
                  Export JSON or CSV for your review record.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section id="demo-film" className="film-section">
          <div className="film-heading">
            <div>
              <p className="section-kicker">The actual product</p>
              <h2>See a review, from start to findings.</h2>
            </div>
            <p>
              A narrated walkthrough with fictional artwork, real deployed
              processing and visible uncertainty.
            </p>
          </div>
          <video
            ref={player}
            controls
            playsInline
            preload="metadata"
            poster="/media/demo-poster.jpg"
            aria-label="Label Review Workbench narrated demonstration"
          >
            <source src="/media/label-review-demo.mp4" type="video/mp4" />
            <track
              src="/media/label-review-demo.vtt"
              kind="captions"
              srcLang="en"
              label="English"
              default
            />
            Your browser does not support this video.{" "}
            <a href="/media/label-review-demo.mp4">Download the demo</a>.
          </video>
          <div className="film-links">
            <a href="/media/demo-transcript.txt">Read the transcript</a>
            <a href="/media/label-review-demo.mp4" download>
              Download video
            </a>
            <span>Recorded product workflow · Synthetic narration</span>
          </div>
        </section>
        <section className="details-section">
          <article className="warning-feature">
            <div className="document-icon" aria-hidden="true">
              Aa
            </div>
            <h2>
              Exact words.
              <br />
              Honest limits.
            </h2>
            <p>
              The government warning gets a stricter check than a brand name.
              Wording and heading capitalization are checked separately. Font
              weight, physical print size and complete regulatory compliance
              remain human responsibilities.
            </p>
            <a href="/workbench">Inspect the example findings</a>
          </article>
          <div className="detail-stack">
            <article>
              <h3>One label or a bounded batch</h3>
              <p>
                Pair up to 300 files with a JSON manifest. Two requests run at a
                time, with independent results, a bounded retry and downloadable
                summaries. Keep the browser tab open.
              </p>
            </article>
            <article>
              <h3>Evidence before certainty</h3>
              <p>
                Missing text, conflicting values and uncorroborated extraction
                stay visible. A failed service call never turns into a
                fabricated successful review.
              </p>
            </article>
            <article>
              <h3>Small, inspectable AWS architecture</h3>
              <p>
                CloudFront, private storage and a server-side review API keep
                external model calls out of the browser. Temporary retention and
                request allowances bound the prototype.
              </p>
            </article>
          </div>
        </section>
        <section className="reviewer-cta">
          <div>
            <h2>Ready to inspect the details?</h2>
            <p>
              Start with the clearly marked example. Use the supplied reviewer
              code for live extraction.
            </p>
          </div>
          <a className="site-button" href="/workbench">
            Open the workbench
          </a>
        </section>
        <footer className="showcase-footer">
          <div>
            <a className="showcase-wordmark" href="https://altrosstudios.games">
              Altros Studios
            </a>
            <p>
              Independent prototype by Elijah Martin. Not an official Treasury
              or TTB system. Content comparison supports a human decision; it
              does not grant label approval.
            </p>
          </div>
          <div>
            <a href="https://github.com/elijah020201/treasury-label-review">
              Source, evaluation and documentation
            </a>
            <a href="/media/demo-transcript.txt">Video transcript</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
