# Operations

## Build and deploy

Use Node 22.12+ and `npm ci`. Run `npm run check`. The stack targets us-east-1 in the approved account and uses the existing CDK bootstrap. After approval run `npx cdk deploy TreasuryLabelReview --outputs-file .local/outputs.json`. `.local` is ignored and must stay private. The outputs provide the reviewer URL, secret ARN, function, image bucket and result table.

Get the reviewer code through Secrets Manager without printing it to public logs or committing it. The code is supplied separately to reviewers. Never include it in README or frontend assets. The public guided example remains accessible without a code.

## Troubleshooting

422 requests a clearer image when model output cannot be validated; 502 means another extraction/configuration failure; 503 means transient service pressure or timeout. Correlate the request ID with the API Lambda log group. Logs report error type and timings only. Check model invocation permission, regional availability, quotas and function package before changing comparison rules. Do not insert a canned fallback. Unauthorized requests return 401. Input errors return 400. Concurrent duplicates return 409 with retry advice. Quota exhaustion returns 429 and is not automatically retried.

Both Nova Lite and Textract must succeed for a live result. Bedrock observed account quota is 200 on-demand requests/minute and 4 million tokens/minute; shared account traffic can consume it. Project concurrency is deliberately much lower. Model availability is not inferred solely from its catalog listing: verify invocation during deployment checks.

Global quota keys are `quota:lifetime`, `quota:day:YYYY-MM-DD`, and `quota:session:<id>`. Counters include failed attempts. Do not reset them casually; increasing allowance changes cost exposure. A reused completed review incurs no new inference. Exact retries after browser timeout can recover a completed result.

## Evaluation

After cost approval, run `npm run evaluate` once for the 14-image synthetic suite. This makes paid requests; do not run hundreds for queue load. The deterministic queue test covers 300 simulated items. Record actual results in docs/evaluation/results.json and summarize sample size/limitations in EVALUATION.md. Repeated sessions cause fresh extraction; repeated requests within a session may return a cached result. Keep cached timing out of fresh latency statistics.

## Demo media and release checks

The checked-in MP4, poster, captions and transcript live in `public/media`. `scripts/demo-script.json` contains the narration. To deliberately regenerate, use `node scripts/prepare-narration.mjs` (AWS Polly requests), `node scripts/record-demo.mjs` (real deployed reviews) and `node scripts/render-demo.mjs` (FFmpeg/FFprobe; Windows Segoe fonts). Preparation caches its audio locally; remove only the specific cached narration file if its script changes. Recording reads the reviewer secret through AWS credentials and excludes authentication preparation from final footage. Inspect regenerated scenes and captions before deployment.

`node scripts/deployed-check.mjs` uses the private `.local/outputs.json`, installed Chrome and AWS credentials. It makes a few live review requests, verifies a partial-failure batch, and creates one disposable session-quota test record at its limit without resetting global counters. It writes private access details under `.local`. `node scripts/release-check.mjs` verifies keyboard navigation, example CSV export, media/captions and same-origin browser requests. `node scripts/local-site-check.mjs` checks the local landing and delayed-sample regression while Vite runs. These are explicit verification commands, not recurring jobs.

## Teardown

When reviewer access is no longer needed, `npx cdk destroy TreasuryLabelReview` destroys this project's saved reviews, image/site buckets, API, distribution, functions and table. Verify stack removal and Secrets Manager recovery-window handling. Leave shared `CDKToolkit` resources intact. CloudFront deletion may take several minutes. Check billing afterward; budget notifications are not a spending cap.
