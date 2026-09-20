# Evaluation — September 20, 2026

## Final extraction pipeline

Pipeline 2026-09-20.2: Textract transcript, Nova Lite image-plus-transcript extraction, strict schema validation, field-specific deterministic comparisons, OCR-sourced warning lines and conservative evidence checks. Raw results are in [results.json](evaluation/results.json). The [initial run](evaluation/initial-run.json) is retained; observed misses drove the documented changes. Both runs used the same 14 synthetic cases.

| Measure | Observed result |
|---|---|
| Live requests | 14 |
| Completed / failed | 13 / 1 |
| Server processing p50 / p95 | 2,880 / 4,617 ms (13 successful, uncached requests) |
| Client request p50 / p95 | 3,002 / 4,717 ms (same 13 requests) |
| Exact normalized field text | 77 / 78 fields in successful requests (98.7%) |
| False matches | 0 / 9 intentionally nonmatching findings |
| False mismatches | 0 / 84 expected matching findings |
| Needs-review content findings | 1 / 93; excludes formatting and domestic origin |
| AI/OCR estimate for this run | $0.02347, excluding Lambda/network/storage and unreported model tokens from the failed request |

The one exact-text difference was “Product of France” versus “France”; the origin comparison correctly normalized that boilerplate. Extraction accuracy excludes the failed request and is not 98.7% coverage of all submitted images. Every successful review also contains a mandatory manual formatting check. The 1/93 rate must not be interpreted as the fraction of labels requiring no human review.

The five-second target was met by the 13 successful observed requests, including the rotated case. This is a small warm-session sample, not a latency guarantee or a production load test. Login invokes Lambda first. CloudWatch reported cold initialization of approximately 515 and 590 ms on observed authentication invocations; a separate cold end-to-end extraction distribution was not measured.

## Failure and limitations

The deliberately downscaled/blurred image produced model output that violated the extraction schema. It returned a failure after 2,507 ms; no canned result was substituted. A subsequent error-message improvement returns an actionable 422 requesting a clearer complete image rather than a generic 502. This presentation change does not erase the recorded failure.

The dataset contains 14 fictional PNGs over three layouts: spirits, imported wine and beer. Cases cover correct content, wrong ABV, inconsistent proof, altered/missing/title-case warning, prompt-injection-like text, another brand, 90-degree rotation, low resolution, glare, wine origin and omitted import origin. Images are generated from source, not real bottle photographs. The findings cannot establish real-world accuracy across arbitrary packaging, glare, fonts, languages or regulatory exceptions. The prompt-injection result is one test case, not a security proof.

The initial pipeline completed 14/14 but missed several class/type values and produced two false mismatches. Feeding OCR into extraction and normalizing explicit country statements improved those cases, with roughly 0.9 seconds added median processing time. Initial and final failures remain public in the raw reports.

## Automated and browser verification

45 deterministic tests cover comparison, warning selection, upload decoding, authentication, cache behavior, quota-before-inference ordering, sanitized errors and bounded queue behavior. The 300-item queue simulation yields 299 successes and one permanent failure; a transient item retries once, and concurrency never exceeds two. This is not 300 paid model calls. Separate deployed browser checks verify a small actual batch.

Desktop/mobile browser checks and axe results are recorded in the submission audit. Automated accessibility checks do not establish complete accessibility. Physical font weight, print size, contrast and layout remain human checks even when warning wording matches.
