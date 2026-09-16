import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  fields,
  labels,
  expectedSchema,
  manifestSchema,
  type Expected,
  type Review,
  type Region,
} from "./domain";
import { sampleExpected, example } from "./sample";
import { runQueue, RequestError, type QueueState } from "./queue";
import { csv, download } from "./export";
import "./style.css";
const empty: Expected = {
  brand: "",
  classType: "",
  alcohol: "",
  netContents: "",
  producer: "",
  origin: "",
  imported: false,
};
async function readImage(file: File) {
  if (file.size > 2 * 1024 * 1024)
    throw new RequestError(
      "Choose a JPEG or PNG no larger than 2 MB.",
      false,
      400,
    );
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new RequestError("The image could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}
async function post(path: string, data: unknown) {
  const r = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "LabelReviewWorkbench",
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(32_000),
  });
  const body = await r
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (!r.ok)
    throw new RequestError(
      body.error || "Request failed.",
      body.retryable === true,
      r.status,
    );
  return body;
}
async function live(file: File, expected: Expected): Promise<Review> {
  try {
    return await post("/api/review", {
      image: await readImage(file),
      expected,
    });
  } catch (e) {
    if (
      e instanceof DOMException &&
      ["TimeoutError", "AbortError"].includes(e.name)
    )
      throw new RequestError(
        "Request timed out. Retry shortly; completed results are reused.",
        true,
        503,
      );
    throw e;
  }
}
function Findings({
  review,
  onEvidence,
}: {
  review: Review;
  onEvidence: (r: Region[]) => void;
}) {
  const counts = review.findings.reduce<Record<string, number>>(
    (a, f) => ((a[f.status] = (a[f.status] || 0) + 1), a),
    {},
  );
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="result-heading">
        <div>
          <h2 id="results-title">Review findings</h2>
          <p>
            {review.mode === "example"
              ? "Precomputed example · no live extraction or measured timing"
              : `${(review.timing.processingMs / 1000).toFixed(2)} seconds processing${review.cached ? " · reused result" : ""}`}
          </p>
        </div>
        <div className="actions">
          <button
            className="secondary"
            onClick={() =>
              download("label-review.json", JSON.stringify(review, null, 2))
            }
          >
            Export JSON
          </button>
          <button
            className="secondary"
            onClick={() =>
              download(
                "label-review.csv",
                csv([review]),
                "text/csv;charset=utf-8",
              )
            }
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="summary">
        {Object.entries(counts).map(([status, count]) => (
          <span
            key={status}
            className={"badge " + status.replaceAll(" ", "-").toLowerCase()}
          >
            {count} {status.toLowerCase()}
          </span>
        ))}
      </div>
      <p className="notice">
        Comparison supports a human decision. It is not approval or a complete
        regulatory compliance review.
      </p>
      {review.imageConcerns.length > 0 && (
        <p className="warning">
          Image concerns: {review.imageConcerns.join("; ")}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Expected application information compared with observed label text
          </caption>
          <thead>
            <tr>
              <th>Field / result</th>
              <th>Application</th>
              <th>Observed label / evidence</th>
            </tr>
          </thead>
          <tbody>
            {review.findings.map((f) => (
              <tr key={f.field}>
                <th scope="row">
                  <span>{f.label}</span>
                  <span
                    className={
                      "badge " + f.status.replaceAll(" ", "-").toLowerCase()
                    }
                  >
                    {f.status === "Match"
                      ? "✓ "
                      : f.status === "Mismatch"
                        ? "× "
                        : f.status === "Needs review"
                          ? "! "
                          : ""}
                    {f.status}
                  </span>
                </th>
                <td>{f.expected}</td>
                <td>
                  <p className="observed">{f.observed}</p>
                  <p className="reason">{f.reason}</p>
                  {f.normalized && (
                    <p className="normalized">Compared as: {f.normalized}</p>
                  )}
                  {f.regions.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        onEvidence(f.regions);
                        document
                          .getElementById("label-preview")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }}
                    >
                      Highlight evidence
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        Review {review.id.slice(0, 16)} · Pipeline {review.version} ·{" "}
        {review.model}
      </p>
    </section>
  );
}
function App() {
  const [expected, setExpected] = useState<Expected>(empty),
    [file, setFile] = useState<File>(),
    [preview, setPreview] = useState(""),
    [review, setReview] = useState<Review>(),
    [regions, setRegions] = useState<Region[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [authenticated, setAuthenticated] = useState(false),
    [authMessage, setAuthMessage] = useState(""),
    [mode, setMode] = useState<"single" | "batch">("single");
  const [manifest, setManifest] = useState<
      ReturnType<typeof manifestSchema.parse>
    >([]),
    [batchFiles, setBatchFiles] = useState<File[]>([]),
    [queue, setQueue] = useState<QueueState<Review>[]>([]),
    [batchBusy, setBatchBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (busy || batchBusy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, batchBusy]);
  function replace(f?: File) {
    setFile(f);
    setReview(undefined);
    setRegions([]);
    setError("");
  }
  async function loadSample(showExample = false) {
    try {
      const r = await fetch("/samples/complete.png");
      if (!r.ok) throw new Error("Sample could not be loaded.");
      replace(
        new File([await r.blob()], "complete.png", { type: "image/png" }),
      );
      setExpected({ ...sampleExpected });
      if (showExample) setReview(example());
    } catch (e) {
      setError(String(e));
    }
  }
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setAuthMessage("");
    try {
      await post("/api/session", { code });
      setAuthenticated(true);
      setCode("");
      setAuthMessage("Live reviews unlocked for this session.");
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Access failed.");
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Upload a label or load the fictional sample first.");
      return;
    }
    const parsed = expectedSchema.safeParse(expected);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join(" "),
      );
      return;
    }
    setBusy(true);
    setReview(undefined);
    setRegions([]);
    try {
      setReview(await live(file, parsed.data));
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed.");
      if (e instanceof RequestError && e.status === 401)
        setAuthenticated(false);
    } finally {
      setBusy(false);
    }
  }
  async function batch(onlyFailed = false) {
    setError("");
    const selected = onlyFailed
      ? manifest.filter((_, i) => queue[i]?.status === "Failed")
      : manifest;
    const filesByName = new Map(batchFiles.map((f) => [f.name, f]));
    if (
      !manifest.length ||
      batchFiles.length > 300 ||
      filesByName.size !== batchFiles.length ||
      selected.some((x) => !filesByName.has(x.filename))
    ) {
      setError(
        "Provide a manifest and one uniquely named image per manifest entry (maximum 300).",
      );
      return;
    }
    setBatchBusy(true);
    try {
      if (onlyFailed) {
        const results = await runQueue(
          selected,
          (entry) => live(filesByName.get(entry.filename)!, entry.expected),
          () => {},
        );
        setQueue((previous) =>
          previous.map((s) => {
            const index = selected.findIndex(
              (x) => x.filename === manifest[s.index].filename,
            );
            return index < 0 ? s : { ...results[index], index: s.index };
          }),
        );
      } else
        await runQueue(
          manifest,
          (entry) => live(filesByName.get(entry.filename)!, entry.expected),
          setQueue,
        );
    } finally {
      setBatchBusy(false);
    }
  }
  const finished = queue.filter(
    (s) => s.status === "Complete" || s.status === "Failed",
  ).length;
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Label Review Workbench home">
          <span className="brandmark" aria-hidden="true">
            L<span>R</span>
          </span>
          <span>
            Label Review
            <br />
            <strong>Workbench</strong>
          </span>
        </a>
        <span className="prototype">Independent assessment prototype</span>
      </header>
      <main>
        <div className="intro">
          <div>
            <h1>A clearer label review.</h1>
            <p>
              Compare the artwork with the application.
              <br />
              Inspect the evidence before making a decision.
            </p>
          </div>
          <div className="sample-callout">
            <strong>Start with a fictional label</strong>
            <p>Explore a prepared example, or load it for live review.</p>
            <div className="actions">
              <button
                className="secondary"
                disabled={busy || batchBusy}
                onClick={() => loadSample(true)}
              >
                View example
              </button>
              <button
                className="text-button"
                disabled={busy || batchBusy}
                onClick={() => loadSample()}
              >
                Load sample
              </button>
            </div>
          </div>
        </div>
        <nav className="tabs" aria-label="Review workflow">
          <button
            aria-pressed={mode === "single"}
            onClick={() => setMode("single")}
          >
            Single label
          </button>
          <button
            aria-pressed={mode === "batch"}
            onClick={() => setMode("batch")}
          >
            Batch review
          </button>
        </nav>
        <details className="access" open={!authenticated}>
          <summary>
            Reviewer access{" "}
            {authenticated ? "— unlocked" : "— needed for live processing"}
          </summary>
          <p>
            The example is open to everyone. For live uploads, enter the access
            code provided with this assessment. No AWS account or API key is
            needed.
          </p>
          <form onSubmit={authenticate}>
            <label htmlFor="code">Reviewer access code</label>
            <div className="inline">
              <input
                id="code"
                type="password"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <button className="secondary">Unlock live reviews</button>
            </div>
          </form>
          <p role="status">{authMessage}</p>
        </details>
        <div role="alert">{error && <p className="error">{error}</p>}</div>
        {mode === "single" ? (
          <>
            <form onSubmit={submit}>
              <div className="workbench">
                <section className="image-panel" aria-labelledby="upload-title">
                  <div className="section-title">
                    <span className="step">1</span>
                    <h2 id="upload-title">Add the label</h2>
                  </div>
                  <label className="upload" htmlFor="image">
                    <strong>
                      {file ? "Replace image" : "Choose a label image"}
                    </strong>
                    <span>JPEG or PNG · up to 2 MB · 20 megapixels</span>
                    <input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={busy}
                      onChange={(e) => replace(e.target.files?.[0])}
                    />
                  </label>
                  {preview ? (
                    <>
                      <div id="label-preview" className="image-stage">
                        <img
                          src={preview}
                          alt={`Uploaded label: ${file?.name}`}
                        />
                        {regions.map((r, i) => (
                          <span
                            key={i}
                            className="evidence-box"
                            style={{
                              left: `${r.left * 100}%`,
                              top: `${r.top * 100}%`,
                              width: `${r.width * 100}%`,
                              height: `${r.height * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="preview-footer">
                        <span>{file?.name}</span>
                        {regions.length > 0 && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => setRegions([])}
                          >
                            Clear highlights
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="empty-preview">
                      <svg
                        width="74"
                        height="92"
                        viewBox="0 0 74 92"
                        aria-hidden="true"
                      >
                        <rect x="20" y="3" width="34" height="13" rx="3" />
                        <path d="M24 16v13L10 43v42q0 4 4 4h46q4 0 4-4V43L50 29V16" />
                        <rect x="17" y="48" width="40" height="28" rx="2" />
                      </svg>
                      <p>Your label appears here.</p>
                      <span>
                        Use a clear, complete image with the warning visible.
                      </span>
                    </div>
                  )}
                  <p className="fine">
                    Use fictional or non-sensitive material. Uploaded images are
                    temporary; see the retention note below.
                  </p>
                </section>
                <section
                  className="form-panel"
                  aria-labelledby="application-title"
                >
                  <div className="section-title">
                    <span className="step">2</span>
                    <h2 id="application-title">Application information</h2>
                  </div>
                  <p className="section-help">
                    Enter what the application says. The image is read
                    independently.
                  </p>
                  <div className="fields">
                    {fields
                      .filter((f) => f !== "origin")
                      .map((f) => (
                        <label
                          key={f}
                          className={f === "producer" ? "wide" : ""}
                        >
                          {labels[f]}
                          <input
                            value={expected[f]}
                            maxLength={500}
                            required
                            disabled={busy}
                            placeholder={
                              f === "alcohol"
                                ? "e.g. 45% Alc./Vol. (90 Proof)"
                                : f === "netContents"
                                  ? "e.g. 750 mL"
                                  : undefined
                            }
                            onChange={(e) => {
                              setExpected({ ...expected, [f]: e.target.value });
                              setReview(undefined);
                            }}
                          />
                        </label>
                      ))}
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={expected.imported}
                      disabled={busy}
                      onChange={(e) => {
                        setExpected({
                          ...expected,
                          imported: e.target.checked,
                        });
                        setReview(undefined);
                      }}
                    />
                    This is an imported product
                  </label>
                  {expected.imported && (
                    <label>
                      Country of origin
                      <input
                        value={expected.origin}
                        required
                        maxLength={500}
                        disabled={busy}
                        onChange={(e) => {
                          setExpected({ ...expected, origin: e.target.value });
                          setReview(undefined);
                        }}
                      />
                    </label>
                  )}
                  <div className="submit-area">
                    <button className="primary" disabled={busy || batchBusy}>
                      {busy ? "Reading the label…" : "Review label"}
                    </button>
                    <p aria-live="polite">
                      {busy
                        ? "Extracting text and checking evidence. This may take up to 30 seconds."
                        : "Live extraction compares six fields and checks the government warning."}
                    </p>
                  </div>
                </section>
              </div>
            </form>
            <div ref={resultRef}>
              {review && <Findings review={review} onEvidence={setRegions} />}
            </div>
          </>
        ) : (
          <section className="batch-panel">
            <h2>Review a batch of labels</h2>
            <p>
              Upload up to 300 uniquely named images and a JSON manifest with
              the expected information for each. Two labels process at a time.
              Keep this tab open; the queue is not a background service.
            </p>
            <button
              className="text-button"
              onClick={() =>
                download(
                  "manifest.json",
                  JSON.stringify(
                    [{ filename: "complete.png", expected: sampleExpected }],
                    null,
                    2,
                  ),
                )
              }
            >
              Download manifest example
            </button>
            <div className="batch-inputs">
              <label>
                Images (JPEG or PNG)
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  disabled={batchBusy}
                  onChange={(e) =>
                    setBatchFiles(Array.from(e.target.files || []))
                  }
                />
              </label>
              <label>
                JSON manifest
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={batchBusy}
                  onChange={async (e) => {
                    setError("");
                    setQueue([]);
                    try {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 1_000_000)
                        throw new Error("Manifest exceeds 1 MB.");
                      setManifest(
                        manifestSchema.parse(JSON.parse(await f.text())),
                      );
                    } catch {
                      setManifest([]);
                      setError(
                        "Invalid manifest. Use the downloaded structure with 1–300 unique filenames and complete expected fields.",
                      );
                    }
                  }}
                />
              </label>
            </div>
            <p>
              {batchFiles.length} images selected · {manifest.length} manifest
              entries
            </p>
            <div className="actions">
              <button
                className="primary"
                disabled={batchBusy || busy || !manifest.length}
                onClick={() => batch()}
              >
                {batchBusy ? "Processing batch…" : "Start batch review"}
              </button>
              {queue.some((s) => s.status === "Failed") && (
                <button
                  className="secondary"
                  disabled={batchBusy}
                  onClick={() => batch(true)}
                >
                  Retry failed items
                </button>
              )}
              {queue.length > 0 && (
                <>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        "batch-summary.json",
                        JSON.stringify(
                          queue.map((s) => ({
                            ...s,
                            filename: manifest[s.index]?.filename,
                          })),
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    Export batch JSON
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        "batch-results.csv",
                        csv(queue.flatMap((s) => (s.result ? [s.result] : []))),
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    Export findings CSV
                  </button>
                </>
              )}
            </div>
            {queue.length > 0 && (
              <>
                <label className="progress-label">
                  {finished} of {queue.length} finished
                  <progress max={queue.length} value={finished} />
                </label>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Status</th>
                        <th>Queued</th>
                        <th>Processing</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((s) => (
                        <tr key={s.id}>
                          <td>{manifest[s.index]?.filename}</td>
                          <td>{s.status}</td>
                          <td>{(s.queueMs / 1000).toFixed(1)} s</td>
                          <td>{(s.processingMs / 1000).toFixed(1)} s</td>
                          <td>
                            {s.error ||
                              (s.result ? (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    download(
                                      "review.json",
                                      JSON.stringify(s.result, null, 2),
                                    )
                                  }
                                >
                                  Download result
                                </button>
                              ) : (
                                "—"
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
        <footer>
          <strong>Evidence for a human decision.</strong>
          <p>
            This prototype checks supplied content. It does not issue label
            approvals, verify every TTB rule, or certify physical warning
            formatting.
          </p>
          <p>
            Images expire through a one-day storage lifecycle. Results become
            unavailable after 24 hours; physical cleanup may occur later.
            Session access lasts eight hours. Do not upload sensitive
            information.
          </p>
          <a
            href="https://github.com/elijah020201/treasury-label-review"
            target="_blank"
            rel="noreferrer"
          >
            Source and documentation
          </a>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
