# Requirements traceability

Official source revision: 62bd63cd2f6b5af088b1d3c3b039c48cfcb012ef. Assessment received September 15, 2026; provisional deadline September 22. GitHub issues contain acceptance criteria and dependencies.

| Requirement | Implementation | Verification |
|---|---|---|
| Image and expected data | React form, strict schema, Sharp validation | schema/image tests; browser sample flow |
| Real extraction | Textract then Nova vision, without expected values | 14 paid cases, 13 completed / 1 documented failure |
| Six application fields | field-specific deterministic comparator | comparison tests and live field-level report |
| Reasonable brand matching | Unicode/case/apostrophe/whitespace normalization | capitalization and apostrophe fixtures |
| Strict warning | exact wording + actual heading case | missing/altered/title-case/paraphrase tests |
| Required formatting | separate Needs review finding | always manual; no automated font-size claim |
| Evidence and uncertainty | OCR corroboration and actual regions | low confidence/no corroboration/conflicts tests; real deployed findings |
| Approximately five seconds | measured processing and extraction timings | successful uncached server p50 2.880 s / p95 4.617 s, n=13; no guarantee |
| Batch 200–300 | bounded browser queue, manifest, progress, partial results | 300-item simulation, concurrency <=2, retry once |
| Imperfect images | EXIF normalization and conservative findings | rotation/glare completed; low-resolution failed safely; synthetic images only |
| Minimal browser dependencies | same-origin static assets and API | browser smoke; deployed checks in SUBMISSION_AUDIT.md |
| Usability and access | sample, labeled inputs, clear statuses, exports | desktop/mobile smoke; axe zero violations on checked views |
| Errors and abuse controls | session auth, quotas, limits, leases, timeouts | forged/expired cookies; invalid uploads; API auth, quota ordering, cache and timeout tests |
| Source and deployment | isolated GitHub repo, CDK, CI | build/synth and deployed stack; final audit in SUBMISSION_AUDIT.md |
| Honest documentation | approach, metrics, limitations, AI disclosure | initial and final raw evaluation reports retained |

The application's scope is content comparison, not complete legal validation. See EVALUATION.md for denominators and limitations. Human approval and actual form submission remain separate from technical readiness.
