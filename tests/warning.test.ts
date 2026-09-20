import { expect, it } from "vitest";
import { warningFromLines } from "../server/warning";
import { WARNING, normalizeOrigin } from "../src/compare";
it("selects observed warning lines without repairing altered text", () => {
  const altered = WARNING.replace("birth defects", "minor discomfort");
  const lines = [
    { text: "OTHER ARTWORK", confidence: 99 },
    ...altered.split(/(?<=:) /).map((text) => ({ text, confidence: 99 })),
  ];
  expect(warningFromLines(lines)?.values[0]).toBe(altered);
});
it("preserves heading case and low-confidence uncertainty", () => {
  const text = WARNING.replace("GOVERNMENT WARNING", "Government Warning");
  expect(warningFromLines([{ text, confidence: 70 }])).toEqual({
    values: [text],
    uncertain: true,
  });
});
it("does not reconstruct truncated, missing or competing warnings", () => {
  expect(
    warningFromLines([
      { text: "GOVERNMENT WARNING: unreadable", confidence: 99 },
    ]),
  ).toBeUndefined();
  expect(warningFromLines([])).toBeUndefined();
  expect(
    warningFromLines([
      { text: WARNING, confidence: 99 },
      { text: WARNING, confidence: 99 },
    ]),
  ).toBeUndefined();
});
it("removes only explicit origin boilerplate, preserving country differences", () => {
  expect(normalizeOrigin("Product of France")).toBe(normalizeOrigin("France"));
  expect(normalizeOrigin("Made in Italy")).not.toBe(normalizeOrigin("France"));
  expect(normalizeOrigin("France or Italy")).not.toBe(
    normalizeOrigin("France"),
  );
});
