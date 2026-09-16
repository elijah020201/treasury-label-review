# Requirements traceability

Official source revision: 62bd63cd2f6b5af088b1d3c3b039c48cfcb012ef. Assessment received September 15, 2026; provisional deadline September 22. GitHub issues contain acceptance criteria and dependencies.

| Requirement | Implementation | Verification |
|---|---|---|
| Image and expected data | React form, strict schema, Sharp validation | schema/image tests; browser sample flow |
| Real extraction | Nova vision + Textract independently from expectations | paid deployment evaluation pending approval |
| Six application fields | field-specific deterministic comparator | 26 domain/input/export tests |
| Reasonable brand matching | Unicode/case/apostrophe/whitespace normalization | capitalization and apostrophe fixtures |
| Strict warning | exact wording + actual heading case | missing/altered/title-case/paraphrase tests |
| Required formatting | separate Needs review finding | always manual; no automated font-size claim |
| Evidence and uncertainty | OCR corroboration and actual regions | low confidence/no corroboration/conflicts tests; live check pending |
| Approximately five seconds | measured processing and extraction timings | real p50/p95 pending; no guarantee |
| Batch 200–300 | bounded browser queue, manifest, progress, partial results | 300-item simulation, concurrency <=2, retry once |
| Imperfect images | EXIF normalization and conservative findings | generated rotation/glare/low-resolution; paid results pending |
| Minimal browser dependencies | same-origin static assets and API | browser smoke; deployed header inspection pending |
| Usability and access | sample, labeled inputs, clear statuses, exports | desktop/mobile smoke; axe zero violations on checked views |
| Errors and abuse controls | session auth, quotas, limits, leases, timeouts | forged/expired cookies; invalid uploads; API auth, quota ordering, cache and timeout tests |
| Source and deployment | isolated GitHub repo, CDK, CI | build/synth passed; deploy pending approval |
| Honest documentation | approach, metrics, limitations, AI disclosure | final reconciliation pending |

The application's scope is content comparison, not complete legal validation. The live dataset must be measured before completing extraction/deployment/evaluation issues.
