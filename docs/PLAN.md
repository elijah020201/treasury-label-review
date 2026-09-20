# Delivery plan — September 16; updated September 20, 2026

Assessment received September 15; provisional deadline September 22. Target reviewable delivery before September 21.
Official assignment: https://github.com/treasurytakehome-rgb/instructions
Assignment revision read in full: 62bd63cd2f6b5af088b1d3c3b039c48cfcb012ef.

## Usage strategy

At the initial check, main Codex weekly usage was 94%; reset September 20 at 15:17 EDT. No reset credits. Spark and Luna reserve buckets reported 0% used; their selectability was not established. Elijah explicitly chose continued implementation on the current model.
Keep one implementation thread, batch independent reads, use focused tests, and record decisions for continuation. Percent remaining is not a token or task estimate. Preserve verification effort; trim enhancements before correctness.

September 20 update: the main allowance reset and implementation continued on the same model. The owner requested the deployed app, a demo at labels.altrosstudios.games and a narrated video. The small AWS stack, demo site and video are deployed; the 14-case live evaluation, 45 deterministic tests and fresh-session audit are complete. The repository and project board are public. Human review remains required before actual submission.

## Implementation sequence

1. Trace requirements and create prioritized issues with acceptance criteria.
2. Implement typed extraction contracts, field-specific comparisons, exact warning checks and deterministic tests.
3. Add React input/preview/findings workflow and fictional sample. Sample output must be visibly precomputed when offline.
4. Implement AWS extraction adapter: evaluate Nova Lite vision and Textract text/evidence; never feed expected values into extraction.
5. Prepare and synthesize a minimal CDK stack, then present cost/access/retention/teardown plan before provisioning.
6. Verify live unseen uploads, auth, invalid inputs, service errors, and a fresh browser session.
7. Add a 300-item browser-managed queue (tab stays open), concurrency 2, per-item retries/progress, exports and server-side idempotency. Simulate queue load; use only a small paid extraction set.
8. Publish measured evaluation, security/operations documentation, reconcile board, and prepare exact submission text for Elijah's review.

## Proposed architecture

React/TypeScript on private S3 through CloudFront; same-origin /api through API Gateway HTTP API to one Lambda; private temporary image bucket; DynamoDB for idempotent results and atomic quotas; Bedrock Nova Lite and Textract on server; CloudWatch logs; Secrets Manager for a generated reviewer access code. CDK TypeScript defines resources.
No NAT, VPC, provisioned model throughput or permanent compute. The September 20 extension adds DNS and an ACM certificate for the existing Altros domain. SQS is deferred because a bounded browser queue meets the prototype workflow with less infrastructure. The browser must remain open; unfinished items can be retried.

## Access and limits proposed

Public static sample; shared reviewer code establishes a signed, HttpOnly cookie for live processing. Secrets are never placed in frontend assets. Same-origin requests, no third-party browser resources. 2 MB input, JPEG/PNG only, maximum 20 megapixels, 300 batch items, concurrency 2, short timeouts and one retry for transient errors. Global daily inference allowance and per-session allowance enforced atomically before paid calls. Unrestricted public inference is deliberately not the access model.
AWS identity verified in account 170787022014, us-east-1; existing CDK bootstrap reused. Nova Lite invocation and Textract processing are verified. EVALUATION.md records latency, cost estimates and quality, including a failed blurred-image case.

## Visual direction

Palette: ink #17324d, paper #f6f8fb, white #ffffff, action blue #175cd3, amber #8a4b08, green #176544. System Segoe UI body with Georgia only for the fictional bottle label. The workbench has a left-aligned task title, image and input form in two columns, and findings below. Status has text and an icon. On narrow screens the workflow becomes a single column. The separate demo landing page uses actual app imagery, a narrated walkthrough and links into the workbench.

## Acceptance gates

- Unseen image goes through real extraction and deterministic comparison; service failure never becomes a match.
- All seven fields have expected/observed/evidence/reason/status; missing/conflicting/uncertain values stay distinct.
- Warning content, actual heading case, and formatting reviewed separately. Bold/size cannot be certified from OCR.
- Measured live latency and sample sizes; no claim that five seconds is achieved without evidence.
- Automated malicious upload, normalization, inconsistent proof, warning, timeout, deduplication and 300-item partial-failure tests.
- AWS approval, deploy verification, repository secret audit, clean docs, accessible reviewer URL and final human review.
