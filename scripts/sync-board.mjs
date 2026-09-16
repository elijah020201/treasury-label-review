import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const state = JSON.parse(readFileSync(".local/project.json", "utf8"));
const gh = (args, input) =>
  execFileSync("gh", args, { encoding: "utf8", input }).trim();
const done = [1, 4, 5, 7, 10];
const review = [2, 3, 8, 9, 11, 12, 13];
for (const row of state.rows) {
  const status = done.includes(row.number)
    ? "Done"
    : review.includes(row.number)
      ? "In Review"
      : [15, 17].includes(row.number)
        ? "Blocked"
        : row.number === 18
          ? "Ready"
          : "In Progress";
  const query =
    "mutation($p:ID!,$i:ID!,$f:ID!,$s:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$s}}){projectV2Item{id}}}";
  const result = JSON.parse(
    gh(
      ["api", "graphql", "--input", "-"],
      JSON.stringify({
        query,
        variables: {
          p: state.project,
          i: row.itemId,
          f: state.field,
          s: state.statuses.find((s) => s.name === status).id,
        },
      }),
    ),
  );
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  if (done.includes(row.number))
    gh([
      "issue",
      "close",
      String(row.number),
      "--repo",
      "elijah020201/treasury-label-review",
      "--comment",
      "Verified in local implementation: 39 passing tests across domain, uploads/auth/API and 300-item queue simulation; TypeScript/build/CDK synth passed; desktop/mobile example smoke and axe checks passed. Scope-specific evidence is mapped in docs/REQUIREMENTS.md. Live extraction/deployment/evaluation remain tracked separately.",
    ]);
  row.status = status;
}
writeFileSync(".local/project.json", JSON.stringify(state, null, 2));
writeFileSync(
  "PROJECT_BOARD.md",
  `# Project board\n\nRemote: https://github.com/users/elijah020201/projects/2\n\nSnapshot: September 16, 2026. Done requires verified acceptance evidence. AWS deployment/live evaluation are awaiting owner approval.\n\n| Issue | Priority | Milestone | Status | Dependencies |\n|---|---|---|---|---|\n` +
    state.rows
      .map(
        (r) =>
          `| [#${r.number} ${r.title}](${r.url}) | ${r.priority} | ${r.milestone} | ${r.status} | ${r.dependencies.join(", ") || "None"} |`,
      )
      .join("\n") +
    "\n",
);
