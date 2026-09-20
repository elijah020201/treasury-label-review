import type { Line } from "../src/domain";
// Select observed OCR lines only. Never insert or repair statutory wording.
export function warningFromLines(lines: Line[]) {
  const starts = lines
    .map((l, i) => (/government\s+warning\s*:/i.test(l.text) ? i : -1))
    .filter((i) => i >= 0);
  if (starts.length !== 1) return undefined;
  const collected: Line[] = [];
  for (let i = starts[0]; i < Math.min(lines.length, starts[0] + 16); i++) {
    collected.push(lines[i]);
    if (/health\s+problems[.!]?\s*$/i.test(lines[i].text))
      return {
        values: [collected.map((l) => l.text).join(" ")],
        uncertain: collected.some((l) => l.confidence < 90),
      };
  }
  return undefined;
}
