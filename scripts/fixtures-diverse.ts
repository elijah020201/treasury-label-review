import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { WARNING } from "../src/compare";
import type { Expected } from "../src/domain";
const wine: Expected = {
  brand: "RIVIÈRE",
  classType: "Chardonnay",
  alcohol: "12.5% Alc./Vol.",
  netContents: "750 mL",
  producer: "Domaine Riviere, 8 Rue des Vignes, Chablis",
  origin: "France",
  imported: true,
};
const beer: Expected = {
  brand: "NORTH PIER",
  classType: "India Pale Ale",
  alcohol: "6.2% ABV",
  netContents: "355 mL",
  producer: "North Pier Brewing, 24 Harbor Road, Portland, ME",
  origin: "",
  imported: false,
};
function wrap(text: string, n: number) {
  const rows: string[] = [];
  let row = "";
  for (const w of text.split(" ")) {
    if ((row + " " + w).length > n) {
      rows.push(row);
      row = w;
    } else row += (row ? " " : "") + w;
  }
  rows.push(row);
  return rows;
}
function artwork(e: Expected, omitOrigin = false) {
  const dark = e === beer;
  const foreground = dark ? "#fff5d6" : "#3a183a",
    background = dark ? "#133449" : "#faf3f7";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1400"><rect width="1000" height="1400" fill="${background}"/><rect x="40" y="40" width="920" height="1320" fill="none" stroke="${foreground}" stroke-width="3"/><g fill="${foreground}" font-family="Arial"><text x="100" y="115" font-size="23">FICTIONAL EVALUATION LABEL · NOT FOR SALE</text><text x="100" y="305" font-family="${dark ? "Arial" : "Georgia"}" font-size="92" font-weight="bold">${e.brand}</text><text x="100" y="390" font-size="47">${e.classType}</text><path d="M100 450H900M100 458H900" stroke="${foreground}"/><text x="100" y="555" font-size="38">${e.alcohol}</text><text x="100" y="630" font-size="38">${e.netContents}</text>${wrap(
    e.producer,
    48,
  )
    .map(
      (s, i) => `<text x="100" y="${720 + 40 * i}" font-size="29">${s}</text>`,
    )
    .join(
      "",
    )}${e.imported && !omitOrigin ? '<text x="100" y="830" font-size="32">Product of France</text>' : ""}<text x="100" y="940" font-size="28" font-weight="bold">GOVERNMENT WARNING:</text>${wrap(
    WARNING.replace("GOVERNMENT WARNING: ", ""),
    56,
  )
    .map(
      (s, i) => `<text x="100" y="${990 + i * 40}" font-size="26">${s}</text>`,
    )
    .join("")}</g></svg>`;
}
const definitions = [
  { name: "imported-wine", expected: wine, omit: false },
  { name: "import-origin-omitted", expected: wine, omit: true },
  { name: "beer-portrait", expected: beer, omit: false },
];
const cases = JSON.parse(
  await readFile("tests/fixtures/cases.json", "utf8"),
).filter((c: { name: string }) => !definitions.some((d) => d.name === c.name));
for (const d of definitions) {
  const file = `public/samples/${d.name}.png`;
  await sharp(Buffer.from(artwork(d.expected, d.omit)))
    .png()
    .toFile(file);
  cases.push({ name: d.name, file, expected: d.expected });
}
await writeFile("tests/fixtures/cases.json", JSON.stringify(cases, null, 2));
await writeFile(
  "public/samples/batch-manifest.json",
  JSON.stringify(
    definitions.map((d) => ({
      filename: d.name + ".png",
      expected: d.expected,
    })),
    null,
    2,
  ),
);
console.log(
  "Added three fixtures across wine and beer layouts, including omitted import origin.",
);
