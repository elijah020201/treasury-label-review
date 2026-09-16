# Project board

Remote: https://github.com/users/elijah020201/projects/2

Snapshot: September 16, 2026. Done requires verified acceptance evidence. AWS deployment/live evaluation are awaiting owner approval.

| Issue | Priority | Milestone | Status | Dependencies |
|---|---|---|---|---|
| [#1 Requirements traceability and acceptance checklist](https://github.com/elijah020201/treasury-label-review/issues/1) | P0 | Requirements and architecture | Done | None |
| [#2 Repository setup and CI](https://github.com/elijah020201/treasury-label-review/issues/2) | P0 | Requirements and architecture | In Review | 1 |
| [#3 AWS infrastructure as code](https://github.com/elijah020201/treasury-label-review/issues/3) | P0 | AWS deployment | In Review | 2 |
| [#4 Input schema and application-data form](https://github.com/elijah020201/treasury-label-review/issues/4) | P0 | Working end-to-end review | Done | 2 |
| [#5 Label upload validation and image handling](https://github.com/elijah020201/treasury-label-review/issues/5) | P0 | Working end-to-end review | Done | 2 |
| [#6 OCR and vision extraction adapter](https://github.com/elijah020201/treasury-label-review/issues/6) | P0 | Working end-to-end review | In Progress | 5 |
| [#7 Deterministic comparison engine](https://github.com/elijah020201/treasury-label-review/issues/7) | P0 | Working end-to-end review | Done | 4 |
| [#8 Government-warning verification](https://github.com/elijah020201/treasury-label-review/issues/8) | P0 | Working end-to-end review | In Review | 6, 7 |
| [#9 Evidence-based review interface](https://github.com/elijah020201/treasury-label-review/issues/9) | P0 | Working end-to-end review | In Review | 4, 6, 7, 8 |
| [#10 Fictional sample fixtures and guided demo](https://github.com/elijah020201/treasury-label-review/issues/10) | P1 | Working end-to-end review | Done | 9 |
| [#11 Batch queue and manifest format](https://github.com/elijah020201/treasury-label-review/issues/11) | P2 | Batch processing and resilience | In Review | 9 |
| [#12 Errors, retries, timeouts and idempotency](https://github.com/elijah020201/treasury-label-review/issues/12) | P1 | Batch processing and resilience | In Review | 6 |
| [#13 Security and abuse controls](https://github.com/elijah020201/treasury-label-review/issues/13) | P1 | AWS deployment | In Review | 3, 5 |
| [#14 Automated tests and evaluation harness](https://github.com/elijah020201/treasury-label-review/issues/14) | P1 | Evaluation and accessibility | In Progress | 7, 8, 12 |
| [#15 Performance measurements](https://github.com/elijah020201/treasury-label-review/issues/15) | P1 | Evaluation and accessibility | Blocked | 14, 17 |
| [#16 Documentation and architecture decisions](https://github.com/elijah020201/treasury-label-review/issues/16) | P1 | Submission readiness | In Progress | 1 |
| [#17 Deployment and fresh-session verification](https://github.com/elijah020201/treasury-label-review/issues/17) | P0 | AWS deployment | Blocked | 3, 9, 13 |
| [#18 Accessibility and final submission audit](https://github.com/elijah020201/treasury-label-review/issues/18) | P1 | Submission readiness | Ready | 11, 14, 15, 16, 17 |
