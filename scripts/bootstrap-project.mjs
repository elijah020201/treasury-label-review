import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const gh = (args, input) =>
  execFileSync("gh", args, { encoding: "utf8", input }).trim();
const api = (path, body) =>
  JSON.parse(gh(["api", path, "--input", "-"], JSON.stringify(body)));
const gql = (query, variables = {}) => api("graphql", { query, variables });
const repo = "elijah020201/treasury-label-review";
const project = "PVT_kwHOAMnVZs4BjpvX";
const field = "PVTSSF_lAHOAMnVZs4BjpvXzhidQ1o";
const options = [
  "Backlog",
  "Ready",
  "In Progress",
  "In Review",
  "Blocked",
  "Done",
].map((name, i) => ({
  name,
  color: ["GRAY", "BLUE", "YELLOW", "PURPLE", "RED", "GREEN"][i],
  description: name,
}));
const updated = gql(
  "mutation($input:UpdateProjectV2FieldInput!){updateProjectV2Field(input:$input){projectV2Field{... on ProjectV2SingleSelectField{options{id name}}}}}",
  { input: { fieldId: field, singleSelectOptions: options } },
);
if (updated.errors) throw new Error(JSON.stringify(updated.errors));
const statuses = updated.data.updateProjectV2Field.projectV2Field.options;
const milestones = [
  "Requirements and architecture",
  "Working end-to-end review",
  "AWS deployment",
  "Batch processing and resilience",
  "Evaluation and accessibility",
  "Submission readiness",
];
const existingMs = JSON.parse(gh(["api", `repos/${repo}/milestones`]));
const ms = milestones.map(
  (title) =>
    existingMs.find((m) => m.title === title) ||
    api(`repos/${repo}/milestones`, { title }),
);
const existingLabels = JSON.parse(gh(["api", `repos/${repo}/labels`]));
for (const [name, color] of [
  ["P0", "b60205"],
  ["P1", "d93f0b"],
  ["P2", "1d76db"],
  ["engineering", "0052cc"],
  ["verification", "0e8a16"],
  ["documentation", "5319e7"],
])
  if (!existingLabels.some((l) => l.name === name))
    api(`repos/${repo}/labels`, { name, color });
const tasks = [
  [
    "Requirements traceability and acceptance checklist",
    0,
    "P0",
    [],
    "Map the official assignment to implemented features and named tests; record receipt date, source revision and unresolved assumptions.",
  ],
  [
    "Repository setup and CI",
    0,
    "P0",
    [1],
    "Strict TypeScript, reproducible lockfile, build and test scripts, GitHub Actions; no secrets or studio files.",
  ],
  [
    "AWS infrastructure as code",
    2,
    "P0",
    [2],
    "CDK synth succeeds; private origins, least privilege, quotas, retention and teardown specified; approval before deploy.",
  ],
  [
    "Input schema and application-data form",
    1,
    "P0",
    [2],
    "Validate all expected fields and import applicability; clear labels and actionable input errors.",
  ],
  [
    "Label upload validation and image handling",
    1,
    "P0",
    [2],
    "Reject forged MIME, oversized files and dimensions; decode actual image, normalize EXIF and strip metadata.",
  ],
  [
    "OCR and vision extraction adapter",
    1,
    "P0",
    [5],
    "Unseen uploads use real AWS extraction; typed schema; observed evidence and uncertainty; no expected-value leakage or canned fallback.",
  ],
  [
    "Deterministic comparison engine",
    1,
    "P0",
    [4],
    "Test Unicode/apostrophes, case, ABV/proof, units, missing fields and conflicting values; conservative entity matching.",
  ],
  [
    "Government-warning verification",
    1,
    "P0",
    [6, 7],
    "Authoritative wording checked; whitespace only normalization; heading case separately tested; formatting uncertainty visible.",
  ],
  [
    "Evidence-based review interface",
    1,
    "P0",
    [4, 6, 7, 8],
    "Preview and side-by-side findings with reasons, evidence, timing, retry/replace and JSON/CSV export.",
  ],
  [
    "Fictional sample fixtures and guided demo",
    1,
    "P1",
    [9],
    "Clearly fictional sample image and expected fields; precomputed mode visibly labeled; live sample goes through real pipeline.",
  ],
  [
    "Batch queue and manifest format",
    3,
    "P2",
    [9],
    "JSON manifest for up to 300 images; unique IDs, concurrency 2, progress, independent outcomes/retries and downloadable summary.",
  ],
  [
    "Errors, retries, timeouts and idempotency",
    3,
    "P1",
    [6],
    "Bounded retry/timeout, duplicate suppression includes image+expected+version; partial failure never discards other results.",
  ],
  [
    "Security and abuse controls",
    2,
    "P1",
    [3, 5],
    "Signed reviewer session, same-origin API, private images, atomic paid-call caps, sanitized errors, no label text in logs and finite retention.",
  ],
  [
    "Automated tests and evaluation harness",
    4,
    "P1",
    [7, 8, 12],
    "Cover listed edge cases and 300-item queue simulation; small real-image suite reports failures honestly.",
  ],
  [
    "Performance measurements",
    4,
    "P1",
    [14, 17],
    "Report sample sizes, p50/p95, warm/cold observations, queue vs processing and estimated per-label cost; do not invent target compliance.",
  ],
  [
    "Documentation and architecture decisions",
    5,
    "P1",
    [1],
    "README plus requirements, architecture, approach, evaluation, security, operations and submission docs reflect actual behavior.",
  ],
  [
    "Deployment and fresh-session verification",
    2,
    "P0",
    [3, 9, 13],
    "Approve concrete AWS plan, deploy, verify live upload and guided demo from fresh unauthenticated browser and collect URLs.",
  ],
  [
    "Accessibility and final submission audit",
    5,
    "P1",
    [11, 14, 15, 16, 17],
    "Keyboard/contrast/mobile checks, secret audit, truthful completed board, exact form text and human review before submission.",
  ],
];
const rows = [];
for (let i = 0; i < tasks.length; i++) {
  const [title, m, p, deps, criteria] = tasks[i];
  const body = `Priority: ${p}\n\nMilestone: ${milestones[m]}\n\nDependencies: ${deps.length ? deps.map((x) => "#" + x).join(", ") : "None"}\n\n## Acceptance criteria\n\n- [ ] ${criteria}\n- [ ] Evidence of verification is recorded before Done.\n`;
  const issue = api(`repos/${repo}/issues`, {
    title,
    body,
    milestone: ms[m].number,
    labels: [
      p,
      i === 13 || i === 14 || i === 17
        ? "verification"
        : i === 0 || i === 15
          ? "documentation"
          : "engineering",
    ],
  });
  const added = gql(
    "mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}",
    { p: project, c: issue.node_id },
  );
  if (added.errors) throw new Error(JSON.stringify(added.errors));
  const status = i === 0 ? "In Progress" : i < 9 ? "Ready" : "Backlog";
  const result = gql(
    "mutation($p:ID!,$i:ID!,$f:ID!,$s:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$s}}){projectV2Item{id}}}",
    {
      p: project,
      i: added.data.addProjectV2ItemById.item.id,
      f: field,
      s: statuses.find((s) => s.name === status).id,
    },
  );
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  rows.push({
    number: issue.number,
    title,
    status,
    priority: p,
    milestone: milestones[m],
    dependencies: deps,
    url: issue.html_url,
    itemId: added.data.addProjectV2ItemById.item.id,
  });
  process.stdout.write(`#${issue.number} ${title}\n`);
}
mkdirSync(".local", { recursive: true });
writeFileSync(
  ".local/project.json",
  JSON.stringify({ project, field, statuses, rows }, null, 2),
);
writeFileSync(
  "PROJECT_BOARD.md",
  `# Project board\n\nRemote: https://github.com/users/elijah020201/projects/2\n\nStatuses: Backlog, Ready, In Progress, In Review, Blocked, Done.\n\nDone requires acceptance evidence. This is a snapshot; remote issues track live status.\n\n| Issue | Priority | Milestone | Status | Dependencies |\n|---|---|---|---|---|\n` +
    rows
      .map(
        (r) =>
          `| [#${r.number} ${r.title}](${r.url}) | ${r.priority} | ${r.milestone} | ${r.status} | ${r.dependencies.join(", ") || "None"} |`,
      )
      .join("\n") +
    "\n",
);
