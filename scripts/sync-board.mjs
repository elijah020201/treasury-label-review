// Read-only snapshot: issue/project updates are deliberate actions, never inferred from code existence.
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const data = JSON.parse(
  execFileSync(
    "gh",
    [
      "project",
      "item-list",
      "2",
      "--owner",
      "elijah020201",
      "--limit",
      "100",
      "--format",
      "json",
    ],
    { encoding: "utf8" },
  ),
);
const rows = data.items
  .filter((i) => i.content?.type === "Issue")
  .map((i) => {
    const match = i.content.body.match(/Dependencies:\s*([^\n.]+)/);
    return {
      number: i.content.number,
      title: i.title,
      url: i.content.url,
      priority: i.labels?.find((l) => /^P[012]$/.test(l)) || "—",
      milestone: i.milestone?.title || "—",
      status: i.status || "Backlog",
      dependencies: match?.[1]?.trim() || "None",
    };
  })
  .sort((a, b) => a.number - b.number);
writeFileSync(
  "PROJECT_BOARD.md",
  `# Project board\n\nRemote: https://github.com/users/elijah020201/projects/2\n\nSnapshot: ${new Date().toISOString().slice(0, 10)}. Technical delivery evidence is in [SUBMISSION_AUDIT.md](docs/SUBMISSION_AUDIT.md). Issue #18 remains In Review for Elijah's final review; no Treasury submission has been made.\n\n| Issue | Priority | Milestone | Status | Dependencies |\n|---|---|---|---|---|\n` +
    rows
      .map(
        (r) =>
          `| [#${r.number} ${r.title}](${r.url}) | ${r.priority} | ${r.milestone} | ${r.status} | ${r.dependencies} |`,
      )
      .join("\n") +
    "\n",
);
console.log(
  `Snapshotted ${rows.length} issues without changing remote status.`,
);
