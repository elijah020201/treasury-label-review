import { WARNING, compare } from "./compare";
import { VERSION, type Expected, type Extraction, type Review } from "./domain";
export const sampleExpected: Expected = {
  brand: "Stone's Throw",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcohol: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  producer: "Stone’s Throw Distillery, 12 Orchard Lane, Frankfort, KY",
  origin: "",
  imported: false,
};
export const sampleExtraction: Extraction = {
  fields: {
    brand: { values: ["STONE’S THROW"], uncertain: false },
    classType: { values: [sampleExpected.classType], uncertain: false },
    alcohol: { values: [sampleExpected.alcohol], uncertain: false },
    netContents: { values: [sampleExpected.netContents], uncertain: false },
    producer: { values: [sampleExpected.producer], uncertain: false },
    origin: { values: [], uncertain: false },
  },
  warning: { values: [WARNING], uncertain: false },
  imageConcerns: [],
};
export function example(): Review {
  return {
    id: "fictional-precomputed-example",
    mode: "example",
    version: VERSION,
    createdAt: new Date().toISOString(),
    model: "Manually authored example; no extraction performed",
    findings: compare(
      sampleExpected,
      sampleExtraction,
      [
        ...Object.values(sampleExtraction.fields).flatMap((x) => x.values),
        WARNING,
      ].map((text) => ({ text, confidence: 100 })),
    ),
    imageConcerns: [],
    timing: { processingMs: 0, extractionMs: 0 },
  };
}
