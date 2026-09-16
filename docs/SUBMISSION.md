# Submission package — not yet ready

Do not submit until Elijah reviews the completed application and documents.

- Repository: https://github.com/elijah020201/treasury-label-review (currently private; reviewer access must be resolved before submission)
- Project board: https://github.com/users/elijah020201/projects/2
- Deployed URL: pending approval and deployment
- Reviewer code: delivered separately, never committed here
- Provisional deadline: September 22, 2026 (assessment received September 15)

## Draft description

Label Review Workbench is a standalone AI-assisted alcohol-label comparison prototype. Reviewers upload label artwork and enter expected application information. AWS-hosted extraction and deterministic comparisons produce evidence-backed findings for brand, class/type, alcohol content, net contents, producer/address, import origin and government-warning content. The interface separates exact warning checks from formatting that needs human inspection. A guided fictional example, bounded batch workflow and JSON/CSV exports support evaluation. The repository documents the architecture, test evidence, measured limitations and AI-assisted development.

## Reviewer walkthrough

1. Open the application and choose View example; this is explicitly precomputed.
2. Enter the supplied reviewer code, choose Load sample, then Review label for live processing.
3. Inspect observed/expected text, status and reason; use evidence highlights when available.
4. Change expected ABV and rerun to demonstrate a discrepancy.
5. Upload an unseen image with its expected information.
6. Try Batch review with the downloadable manifest and matching images.
7. Export findings. Review warning formatting manually.

## Final checklist

- [ ] Deployed URL and code work from a fresh session.
- [ ] Repository is accessible to Treasury and contains no credentials or unrelated private material.
- [ ] Actual evaluation metrics and known failures are published.
- [ ] Five-second target is described according to measurements.
- [ ] Board reflects only verified work as Done.
- [ ] Elijah has reviewed and approved the exact submission text.
- [ ] Final form is submitted by Elijah or after explicit authorization.
