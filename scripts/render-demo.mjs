import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const capture = JSON.parse(readFileSync(".local/video/capture.json", "utf8"));
const duration = Number(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      capture.video,
    ],
    { encoding: "utf8" },
  ),
);
const offset = Math.max(0, duration - capture.elapsed);
const font = "C\\:/Windows/Fonts/segoeui.ttf";
const bold = "C\\:/Windows/Fonts/seguisb.ttf";
for (let i = 0; i < capture.scenes.length; i++) {
  const s = capture.scenes[i];
  writeFileSync(`.local/video/title-${i}.txt`, s.title);
  writeFileSync(`.local/video/caption-${i}.txt`, s.caption);
  const filter = `scale=1728:918,pad=1920:1080:96:62:color=0x102b43,drawtext=fontfile='${bold}':text='Altros Label Review':fontsize=26:fontcolor=white:x=96:y=18,drawtext=fontfile='${font}':text='Actual application. Fictional labels.':fontsize=20:fontcolor=0xc6d7ea:x=1450:y=24,drawtext=fontfile='${bold}':textfile='.local/video/title-${i}.txt':fontsize=27:fontcolor=white:x=96:y=994,drawtext=fontfile='${font}':textfile='.local/video/caption-${i}.txt':fontsize=24:fontcolor=0xc6d7ea:x=96:y=1033`;
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(offset + s.captureStart),
      "-i",
      capture.video,
      "-i",
      `.local/video/voice-${i}.mp3`,
      "-t",
      String(s.seconds),
      "-vf",
      filter,
      "-af",
      "apad,loudnorm=I=-16:TP=-1.5:LRA=11",
      "-r",
      "25",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      `.local/video/scene-${i}.mp4`,
    ],
    { stdio: "pipe" },
  );
  console.log(`Rendered ${i + 1}/${capture.scenes.length}`);
}
writeFileSync(
  ".local/video/concat.txt",
  capture.scenes.map((_, i) => `file 'scene-${i}.mp4'`).join("\n"),
);
execFileSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    ".local/video/concat.txt",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    "public/media/label-review-demo.mp4",
  ],
  { stdio: "pipe" },
);
execFileSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    "25",
    "-i",
    "public/media/label-review-demo.mp4",
    "-frames:v",
    "1",
    "public/media/demo-poster.jpg",
  ],
  { stdio: "pipe" },
);
console.log("Created narrated 1080p demo, poster and captions.");
