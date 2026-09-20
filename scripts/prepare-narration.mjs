import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const scenes = JSON.parse(readFileSync("scripts/demo-script.json", "utf8"));
mkdirSync(".local/video", { recursive: true });
mkdirSync("public/media", { recursive: true });
let cursor = 0;
const vtt = ["WEBVTT", ""];
const timestamp = (s) => {
  const ms = Math.round(s * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};
for (let i = 0; i < scenes.length; i++) {
  const s = scenes[i],
    file = `.local/video/voice-${i}.mp3`;
  writeFileSync(`.local/video/voice-${i}.txt`, s.text);
  if (!existsSync(file))
    execFileSync(
      "aws",
      [
        "polly",
        "synthesize-speech",
        "--region",
        "us-east-1",
        "--engine",
        "neural",
        "--voice-id",
        "Matthew",
        "--output-format",
        "mp3",
        "--sample-rate",
        "24000",
        "--text",
        `file://.local/video/voice-${i}.txt`,
        file,
      ],
      { stdio: "pipe" },
    );
  const seconds = Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
      ],
      { encoding: "utf8" },
    ),
  );
  s.seconds = Math.ceil(seconds + 2);
  s.audioSeconds = seconds;
  s.start = cursor;
  const sentences = s.text.match(/[^.!?]+[.!?]+/g) || [s.text];
  let offset = 0;
  const total = sentences.reduce((n, t) => n + t.trim().length, 0);
  for (const sentence of sentences) {
    const length = (seconds * sentence.trim().length) / total;
    vtt.push(
      `${timestamp(cursor + offset)} --> ${timestamp(cursor + offset + length)}`,
      sentence.trim(),
      "",
    );
    offset += length;
  }
  cursor += s.seconds;
  console.log(`${i + 1}: ${s.seconds}s ${s.title}`);
}
writeFileSync(".local/video/timeline.json", JSON.stringify(scenes, null, 2));
writeFileSync("public/media/label-review-demo.vtt", vtt.join("\n"));
writeFileSync(
  "public/media/demo-transcript.txt",
  "Label Review Workbench — narrated product demonstration\nActual application; fictional labels. Narration synthesized with Amazon Polly.\n\n" +
    scenes.map((s) => s.title + "\n" + s.text).join("\n\n") +
    "\n",
);
console.log(`Narration prepared: ${cursor} seconds total.`);
