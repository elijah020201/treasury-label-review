# Submission package — prepared for Elijah's review

Do not submit until Elijah reviews the completed application and documents.

- Repository: https://github.com/elijah020201/treasury-label-review (public)
- Project board: https://github.com/users/elijah020201/projects/2
- Deployed application: https://labels.altrosstudios.games/workbench
- Demo site: https://labels.altrosstudios.games
- Narrated video: https://labels.altrosstudios.games/media/label-review-demo.mp4
- Reviewer code: delivered separately, never committed here
- Provisional deadline: September 22, 2026 (assessment received September 15)

## Project description

Label Review Workbench is a standalone AI-assisted alcohol-label comparison prototype. Reviewers upload label artwork and enter expected application information. AWS-hosted extraction and deterministic comparisons produce evidence-backed findings for brand, class/type, alcohol content, net contents, producer/address, import origin and government-warning content. The interface separates exact warning checks from formatting that needs human inspection. A guided fictional example, bounded batch workflow and JSON/CSV exports support evaluation. The repository documents the architecture, test evidence, measured limitations and AI-assisted development.

## Reviewer walkthrough

1. Open the application and choose View example; this is explicitly precomputed.
2. Enter the supplied reviewer code, choose Load sample, then Review label for live processing.
3. Inspect observed/expected text, status and reason; use evidence highlights when available.
4. Change expected ABV and rerun to demonstrate a discrepancy.
5. Upload an unseen image with its expected information.
6. Try Batch review with the downloadable manifest and matching images.
7. Export findings. Review warning formatting manually.

## Form fields

The live Microsoft form was inspected September 20. It asks for name, phone, email, source-code repository and deployed application URL. The private local worksheet contains Elijah's contact details and the reviewer code; neither belongs in this public document.

Source-code field: `https://github.com/elijah020201/treasury-label-review`.

Deployed-application field: start with `https://labels.altrosstudios.games/workbench`, then include the privately supplied reviewer access code and the instruction: “Choose View example for a public precomputed review. Unlock live reviews with this code, load a sample or upload a JPEG/PNG, enter the expected information, and select Review label. Demo and narrated walkthrough: https://labels.altrosstudios.games.”

Do not submit until the exact private worksheet has been reviewed. Form: https://forms.osi.office365.us/r/nGRMaxG14m.

## Final checklist

- [x] Deployed URL and code work from a fresh session.
- [x] Repository visibility is public; known-secret/pattern scan and source inventory passed.
- [x] Actual evaluation metrics and known failures are documented.
- [x] Five-second target is described according to measurements.
- [x] Technical verification is recorded in SUBMISSION_AUDIT.md; board issue #18 remains In Review for the human gate.
- [ ] Elijah has reviewed and approved the exact submission text.
- [ ] Final form is submitted by Elijah or after explicit authorization.
