import { z } from "zod";
export const VERSION = "2026-09-16.1";
export const fields = [
  "brand",
  "classType",
  "alcohol",
  "netContents",
  "producer",
  "origin",
] as const;
export type Field = (typeof fields)[number];
export const labels: Record<Field, string> = {
  brand: "Brand name",
  classType: "Class / type",
  alcohol: "Alcohol content",
  netContents: "Net contents",
  producer: "Producer / bottler and address",
  origin: "Country of origin",
};
const text = z.string().trim().max(500);
export const expectedSchema = z
  .object({
    brand: text.min(1),
    classType: text.min(1),
    alcohol: text.min(1),
    netContents: text.min(1),
    producer: text.min(1),
    origin: text,
    imported: z.boolean(),
  })
  .strict()
  .refine((x) => !x.imported || x.origin.length > 0, {
    message: "Country of origin is required for imports.",
    path: ["origin"],
  });
export type Expected = z.infer<typeof expectedSchema>;
const observationSchema = z
  .object({
    values: z.array(z.string().max(2000)).max(8),
    uncertain: z.boolean(),
  })
  .strict();
export const extractionSchema = z
  .object({
    fields: z
      .object({
        brand: observationSchema,
        classType: observationSchema,
        alcohol: observationSchema,
        netContents: observationSchema,
        producer: observationSchema,
        origin: observationSchema,
      })
      .strict(),
    warning: observationSchema,
    imageConcerns: z.array(z.string().max(300)).max(8),
  })
  .strict();
export type Extraction = z.infer<typeof extractionSchema>;
export interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Line {
  text: string;
  confidence: number;
  region?: Region;
}
export type Status =
  "Match" | "Mismatch" | "Not found" | "Needs review" | "Not applicable";
export interface Finding {
  field: string;
  label: string;
  expected: string;
  observed: string;
  normalized?: string;
  status: Status;
  evidence: string;
  reason: string;
  regions: Region[];
}
export interface Review {
  id: string;
  mode: "live" | "example";
  version: string;
  createdAt: string;
  findings: Finding[];
  imageConcerns: string[];
  timing: { processingMs: number; extractionMs: number };
  usage?: { inputTokens: number; outputTokens: number };
  model: string;
  cached?: boolean;
}
export const requestSchema = z
  .object({ expected: expectedSchema, image: z.string().min(1).max(2_800_000) })
  .strict();
export const manifestSchema = z
  .array(
    z
      .object({
        filename: z.string().min(1).max(255),
        expected: expectedSchema,
      })
      .strict(),
  )
  .min(1)
  .max(300)
  .refine(
    (x) => new Set(x.map((y) => y.filename)).size === x.length,
    "Manifest filenames must be unique.",
  );
