# Approach, assumptions and tools

This prototype was built with AI assistance using OpenAI Codex for implementation, research, tests and documentation. Elijah Martin is the applicant and reviews the delivered work. It is not represented as unaided development.

The official assignment at https://github.com/treasurytakehome-rgb/instructions was read in full at revision 62bd63cd2f6b5af088b1d3c3b039c48cfcb012ef. Its emphasis on working core functionality, usability, latency, sensible matching and strict warning text guided scope. The user requested AWS and a project board; the official assignment itself permits any suitable stack.

React and TypeScript provide explicit contracts across frontend, domain and backend. Zod checks application input and untrusted model output. Sharp verifies and normalizes images. AWS SDK v3 calls Nova Lite and Textract. CDK defines infrastructure; Vitest covers domain and failure cases; Playwright and axe check the browser workflow. The dependency lockfile records exact versions.

Nova Lite provides layout-aware field extraction; Textract supplies an independent text transcript and genuine geometry. Both must support a value before deterministic comparison can match it. Model JSON is prompted, then validated: Nova Lite does not guarantee this schema natively. A schema/service failure is exposed; no fictional output replaces it. Image text cannot invoke tools, modify the pipeline or supply expected data. A small prompt-injection fixture tests that boundary but does not prove universal resistance.

## Comparison policy

Brand, class/type, producer and origin normalize Unicode NFKC, apostrophe variants, case and whitespace. They otherwise require exact text: no broad fuzzy matching, abbreviation expansion or synonym equivalence. Missing application values are input errors. Domestic origin is not applicable; imported origin is required.

Alcohol parses percent and proof, requiring consistent values (US proof = twice ABV). An inconsistency yields Needs review. Net contents support mL, L and explicitly identified US fluid ounces; ambiguous ounces require review. Only exact normalized numeric equivalence within a 0.001 mL floating-point margin matches; this is not a regulatory tolerance.

Each field exposes observed text, expected text, normalized value where relevant, status, explanation and genuine OCR regions when available. Multiple competing values, poor OCR evidence and model uncertainty require review. OCR confidence below 90 is a conservative threshold, not a calibrated probability of correctness.

The warning string was verified from [TTB's health-warning guidance](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-health-warning). Only whitespace and line breaks are ignored. Wording, punctuation and capitalization remain strict. The heading is checked before ordinary text normalization. Font weight and physical size are not established by the pipeline; formatting always requires review. The TTB page also specifies a non-bold body and other layout requirements; those remain human checks.

## Deliberate scope limits

One image per item; combine relevant panels into readable artwork before upload. The prototype assumes a beverage to which the government warning applies and does not encode every type-specific or low-alcohol legal exception. No COLA connection, regulatory approval, FedRAMP claim or production accreditation. No ZIP parser. Batch progress lives in the browser. No real government records or sensitive data are needed.
