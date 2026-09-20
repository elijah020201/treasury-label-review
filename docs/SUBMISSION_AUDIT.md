# Delivery audit — September 20, 2026

The application, Altros-domain demo site and narrated video are deployed. Technical checks below passed. Elijah's review and actual Treasury form submission remain outstanding; no form was submitted and Treasury was not contacted.

## Build and implementation

- `npm run check`: strict TypeScript, 45 tests, production frontend/backend builds and CDK synthesis passed on Windows with Node 22.
- Tests cover deterministic comparisons, OCR warning selection, authentication, upload decoding, API/cache/error behavior and a 300-item queue simulation. The simulated queue has 299 successful items, one permanent failure and a bounded transient retry.
- A browser regression test delayed a sample response, selected a different image, and verified that the selected image and entered fields survived the late response.
- Production dependency audit reported zero known vulnerabilities. This is a tool snapshot, not a guarantee about all vulnerabilities.

## Actual deployment

Stack `TreasuryLabelReview` completed its final site/backend deployment in AWS us-east-1. HTTPS serves https://labels.altrosstudios.games and /workbench. CloudFront uses a private S3 origin; same-origin API Gateway/Lambda calls Textract and Nova Lite. DynamoDB, a private temporary image bucket, Secrets Manager and seven-day logs support bounded processing.

Fresh Playwright/Chrome sessions verified:

- The public example is visibly precomputed; unauthenticated live processing returns 401.
- The private reviewer code unlocks live processing. An imported-wine image produced real field findings, including a matching origin.
- An identical request reused the result; changed expected alcohol produced a new ID and a mismatch.
- A real three-item batch completed two items and isolated one invalid image as Failed; JSON export retained all outcomes.
- A dedicated test session was set to its 500-attempt limit. The real DynamoDB transaction returned 429 before paid extraction and left the lifetime counter unchanged. Global counters were not reset.
- Foreign-origin preflight received no CORS permission. Anonymous direct S3 object access returned 403.
- CSV export included findings and the mandatory manual warning-formatting check.
- The root Altros and Aegis sites still returned HTTP 200.

Machine-readable results are in [verification.json](evaluation/verification.json). AWS outputs and access codes stay in ignored local files.

## User interface and media

- Landing and live-review views: axe WCAG 2 A/AA and 2.1 AA scans reported zero violations at 1440px and 390px. Landing pages had no horizontal overflow; desktop/mobile screenshots were visually inspected.
- Tab navigation reached the primary links, and Enter opened the workbench. This focused check and axe do not replace a full assistive-technology audit.
- Observed browser network requests used only labels.altrosstudios.games. AI calls occur on the server.
- The video is 126.01 seconds, 1920×1080, 25 fps, H.264/AAC, approximately 8.5 MB. It contains actual deployed workflows with fictional images and synthesized Matthew narration from Amazon Polly.
- Six chapter frames were visually inspected. FFmpeg decoded the complete video/audio without errors, found no black intervals over 0.5 seconds, and measured mean audio −16.7 dB and peak −1.2 dB. Narration durations fit within their chapters. This verifies the encoded audio and script alignment; no human listening review is claimed.
- Public playback and seeking worked at 25 and 110 seconds, and English caption cues loaded. Poster, transcript and downloadable MP4 are served with the site. Authentication preparation is outside the published footage.

## Evaluation and source access

The 14-case live evaluation completed 13 cases; the deliberately blurred case failed schema validation. Successful uncached processing measured p50 2.880 s and p95 4.617 s. False matches were 0/9 and false mismatches 0/84 in this small synthetic set. See [EVALUATION.md](EVALUATION.md) for denominators, the retained initial run, cost estimation and limitations. No arbitrary-photograph accuracy or universal five-second guarantee is claimed.

The repository and project board are public. A known-reviewer-secret and common credential-pattern scan covered the working source and all existing Git history blobs without findings. The source inventory contains this standalone prototype, fictional fixtures and generated demo assets. The private submission worksheet and reviewer code are excluded by `.gitignore`. CI and final source publication are verified through pull request #19.

## Human gate

Issue #18 stays In Review because it explicitly includes Elijah's final review. The private submission worksheet contains exact form entries, contact details and the code. Operating allowance remains approximately $5 for a low-volume month, with the documented $10 planning contingency; it is not an AWS billing hard cap. Teardown instructions are in OPERATIONS.md.
