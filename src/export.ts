import type { Review } from "./domain";
const cell = (v: unknown) =>
  '"' +
  String(v ?? "")
    .replace(/^[=+@\-\t\r]/, "'$&")
    .replaceAll('"', '""') +
  '"';
export const csv = (reviews: Review[]) =>
  [
    [
      "Review ID",
      "Mode",
      "Field",
      "Expected",
      "Observed",
      "Status",
      "Reason",
      "Evidence",
      "Processing ms",
    ],
    ...reviews.flatMap((r) =>
      r.findings.map((f) => [
        r.id,
        r.mode,
        f.label,
        f.expected,
        f.observed,
        f.status,
        f.reason,
        f.evidence,
        r.timing.processingMs,
      ]),
    ),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
