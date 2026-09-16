import {
  fields,
  labels,
  type Expected,
  type Extraction,
  type Finding,
  type Line,
  type Status,
} from "./domain";
// TTB health-warning statement, verified 2026-09-16. Whitespace only is ignored.
export const WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";
export const space = (s: string) => s.replace(/\s+/gu, " ").trim();
export const normalize = (s: string) =>
  space(s.normalize("NFKC").replace(/[‘’ʼ]/gu, "'")).toLocaleLowerCase("en-US");
export function alcohol(s: string): number | null {
  const abvs = [...s.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]));
  const proofs = [...s.matchAll(/(\d+(?:\.\d+)?)\s*proof\b/gi)].map(
    (m) => Number(m[1]) / 2,
  );
  const vals = [...abvs, ...proofs];
  if (
    !vals.length ||
    vals.some((v) => v < 0 || v > 100) ||
    vals.some((v) => Math.abs(v - vals[0]) > 0.001)
  )
    return null;
  return vals[0];
}
export function volume(s: string): number | null {
  const m = normalize(s).match(
    /^(\d+(?:\.\d+)?)\s*(ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|us fl\.?\s*oz\.?)$/,
  );
  if (!m) return null;
  const factor = m[2].startsWith("m")
    ? 1
    : m[2].startsWith("l")
      ? 1000
      : 29.5735295625;
  return Number(m[1]) * factor;
}
function evidence(value: string, lines: Line[], exactCase = false) {
  const transform = exactCase ? space : normalize;
  const target = transform(value),
    joined = transform(lines.map((l) => l.text).join(" "));
  const supported = !!target && joined.includes(target);
  const relevant = lines.filter(
    (l) =>
      target.includes(transform(l.text)) || transform(l.text).includes(target),
  );
  return {
    supported: supported && relevant.length > 0,
    low: relevant.some((l) => l.confidence < 90),
    regions: relevant.flatMap((l) => (l.region ? [l.region] : [])),
  };
}
export function compare(
  expected: Expected,
  ex: Extraction,
  lines: Line[],
): Finding[] {
  const result: Finding[] = fields.map((field) => {
    const obs = ex.fields[field],
      value = obs.values.join(" | "),
      ev = evidence(value, lines);
    let status: Status = "Needs review",
      reason = "Review the extracted text against the image.";
    let normalized = normalize(value);
    if (field === "origin" && !expected.imported) {
      status = "Not applicable";
      reason =
        "Application identifies a domestic product; import-origin comparison is not applicable.";
    } else if (!expected[field]) {
      reason = "Expected application information is incomplete.";
    } else if (!obs.values.length) {
      status = obs.uncertain ? "Needs review" : "Not found";
      reason = obs.uncertain
        ? "Image evidence is unreadable or uncertain; supply a clearer image."
        : "No value was extracted. Confirm the complete label was supplied.";
    } else if (obs.values.length > 1) {
      reason =
        "Multiple values were extracted; select the relevant label panel and verify manually.";
    } else if (obs.uncertain || !ev.supported || ev.low) {
      reason =
        "Extraction is uncertain or not corroborated by readable OCR evidence. Inspect the image.";
    } else if (field === "alcohol" || field === "netContents") {
      const parser = field === "alcohol" ? alcohol : volume,
        a = parser(expected[field]),
        b = parser(value);
      normalized =
        b === null
          ? "Unresolved"
          : String(b) + (field === "alcohol" ? "% ABV" : " mL");
      if (a === null || b === null) {
        reason =
          field === "alcohol"
            ? "ABV/proof is missing, conflicting, or not parseable. Verify both values."
            : "Unit or quantity is ambiguous. Use mL, L, or explicit US fl oz.";
      } else {
        status = Math.abs(a - b) < 0.001 ? "Match" : "Mismatch";
        reason =
          status === "Match"
            ? "Numeric values agree after unit normalization."
            : "Numeric values differ from the application.";
      }
    } else {
      status =
        normalize(expected[field]) === normalize(value) ? "Match" : "Mismatch";
      reason =
        status === "Match"
          ? "Text agrees after Unicode, case, apostrophe and whitespace normalization."
          : "Text differs. No fuzzy entity or class/type equivalence is assumed.";
    }
    return {
      field,
      label: labels[field],
      expected: expected[field] || "Not supplied",
      observed: value || "Not found",
      normalized,
      status,
      evidence: value,
      reason,
      regions: ev.regions,
    };
  });
  const warning = ex.warning.values.join(" | "),
    ev = evidence(warning, lines, true);
  const reliable =
    ex.warning.values.length === 1 &&
    !ex.warning.uncertain &&
    ev.supported &&
    !ev.low;
  const status: Status = !warning
    ? ex.warning.uncertain
      ? "Needs review"
      : "Not found"
    : !reliable
      ? "Needs review"
      : space(warning) === WARNING
        ? "Match"
        : "Mismatch";
  result.push({
    field: "warning",
    label: "Warning wording",
    expected: WARNING,
    observed: warning || "Not found",
    status,
    evidence: warning,
    regions: ev.regions,
    reason:
      status === "Match"
        ? "Required wording agrees exactly, ignoring line breaks and whitespace only."
        : status === "Mismatch"
          ? "Warning differs from required wording, punctuation or capitalization."
          : status === "Not found"
            ? "No warning was extracted; verify all label panels."
            : "Warning could not be corroborated reliably. A clearer image or manual transcription review is needed.",
  });
  const heading = warning.match(/government\s+warning\s*:/i)?.[0] || "";
  result.push({
    field: "heading",
    label: "Warning heading case",
    expected: "GOVERNMENT WARNING:",
    observed: heading || "Not found",
    status: !heading
      ? "Not found"
      : !reliable
        ? "Needs review"
        : space(heading) === "GOVERNMENT WARNING:"
          ? "Match"
          : "Mismatch",
    evidence: heading,
    regions: ev.regions,
    reason:
      "Heading is checked before case normalization; OCR must corroborate its actual capitalization.",
  });
  result.push({
    field: "formatting",
    label: "Warning formatting",
    expected:
      "Bold heading; non-bold body; required size, contrast and separation",
    observed: "Manual inspection required",
    status: "Needs review",
    evidence: "",
    regions: ev.regions,
    reason:
      "OCR and model output do not establish font weight or physical print size. Verify heading/body weight, continuous paragraph, size, contrast and placement against the original artwork.",
  });
  return result;
}
