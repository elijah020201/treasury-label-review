# Evaluation

## Verified local results

September 16, 2026: 39 deterministic tests passed, strict TypeScript passed, production build and CDK synthesis passed. Desktop and 390-pixel mobile browser checks passed with no JavaScript page errors or page-wide overflow. Axe WCAG 2 A/AA and 2.1 AA rules found zero violations on the checked views. These automated checks do not prove complete accessibility.

The queue simulation processes 300 items at concurrency two: 299 succeed, one permanent failure remains isolated, and a transient failure succeeds on its second attempt. A separate test confirms timeout retries stop after two attempts. This is simulated queue behavior, not 300 paid model calls.

## Dataset

Eleven generated fictional PNG labels: complete, wrong ABV, inconsistent proof, altered warning, title-case heading, absent warning, injection-like text, unseen alternative brand, 90-degree rotation, low resolution, and glare. The source generator and manifest are checked in. These share a single layout, so results cannot establish broad real-world label accuracy. Deterministic tests additionally cover units, origin omission, missing expected input, producer differences, multiple values, unreadable evidence and invalid uploads.

## Live measurements

Pending deployment approval. No live accuracy, false-match rate, p50/p95 latency, cold-start timing or per-label measured cost is claimed yet. `npm run evaluate` will write the complete results, including failures, to `docs/evaluation/results.json`. Timing excludes queue wait at the server; the batch UI reports queue wait separately. First request is not assumed cold without CloudWatch evidence.

Exact field extraction compares the six observed fields with known fixture text. False-match denominators include intentionally wrong/missing/conflicting findings; false-mismatch denominators include expected matching findings. Needs-review rates exclude the always-manual formatting finding and domestic origin. Small sample sizes must accompany all rates. Processing p50/p95 use uncached successful calls only; failed-call durations remain in the raw report.

GitHub CI also passed on Linux: https://github.com/elijah020201/treasury-label-review/actions/runs/35065024868 . Dependency audit: zero known vulnerabilities at the checkpoint.
