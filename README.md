# Label Review Workbench

An AI-assisted alcohol-label comparison prototype for Treasury's IT Specialist (AI) take-home assessment. Upload a label, enter the application's expected information, and inspect evidence-based findings. A match is not legal approval.

**Deployment:** pending approval and verification. **Project:** https://github.com/users/elijah020201/projects/2

## Quick start

Open the application and choose **View example** for a clearly marked fictional, precomputed review. Choose **Load sample**, enter the reviewer access code and select **Review label** to run actual AWS extraction. Replace the image and expected information to review an unseen label. Review warning formatting manually even when its text matches.

Live access uses a code supplied privately with the submission. Reviewers need no AWS account or API key. The public example does not make model calls.

## Local setup

Node.js 22.12+ and npm are required. Install with `npm ci`, then run `npm run dev` and, in a second terminal, `npm run dev:api`. Open http://127.0.0.1:5173. The example works without AWS credentials. Local live calls are disabled by default; after approving costs, set `LIVE_ENABLED=true` for the API process and configure your own AWS credential chain in us-east-1. Never put credentials in frontend code.

`npm run fixtures` regenerates the fictional PNG dataset and manifest. Generated fixtures are checked in. `npm run check` performs TypeScript checking, unit/security/queue tests, production builds and CDK synthesis. `node scripts/browser-check.mjs` performs an example-flow and accessibility smoke test against the running local app using installed Chrome. `npm run evaluate` requires approved deployed AWS resources and `.local/outputs.json`; it makes one real call per fixture and writes measured results.

## Batch review

Choose **Batch review**, upload uniquely named JPEG/PNG files and a JSON manifest. Download a manifest example from the interface. Each record is `{ "filename": "complete.png", "expected": { ... } }`; see [sample manifest](public/samples/manifest.json). Limits: 300 items, 2 MB per image, 20 megapixels, two concurrent requests. Keep the tab open. Failed transient requests get one retry; failed items can be retried independently. JSON includes all outcomes; findings CSV contains successful reviews. Server-side idempotency includes normalized image, expected fields and pipeline version, scoped to the reviewer session.

## Deployment

Read [deployment plan](docs/DEPLOYMENT_PLAN.md) and obtain owner approval before billable deployment. Run `npm run check`, then `npx cdk deploy TreasuryLabelReview --outputs-file .local/outputs.json`. The CDK bootstrap must already exist. Windows builds package Linux Sharp binaries for Lambda. Obtain the reviewer code privately from the Secrets Manager ARN in stack outputs. `npx cdk destroy TreasuryLabelReview` tears down project resources; review [operations](docs/OPERATIONS.md) first.

## Scope and limitations

- Six application fields, government-warning wording, actual heading capitalization and a separate manual-formatting finding.
- Nova Lite vision proposes transcriptions; Textract corroborates text and supplies genuine line boxes. Model self-confidence is not treated as calibrated probability.
- Conservative handling of ambiguity; false uncertainty is preferred to an unsupported match. Class/type synonyms and fuzzy address matching are not assumed.
- Physical text size, font weight, contrast, complete bottle panels, legal exceptions and comprehensive regulatory compliance require human review.
- The five-second goal is a measured target, not an established guarantee. See [evaluation](docs/EVALUATION.md).
- Batch work is browser-managed, not a durable background queue. No COLA integration or production accreditation.

## Documentation

[Requirements](docs/REQUIREMENTS.md) · [Architecture](docs/ARCHITECTURE.md) · [Approach and AI disclosure](docs/APPROACH.md) · [Evaluation](docs/EVALUATION.md) · [Security](docs/SECURITY.md) · [Operations](docs/OPERATIONS.md) · [Submission](docs/SUBMISSION.md)
