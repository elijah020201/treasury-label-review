# Security and retention

The prototype uses synthetic/non-sensitive labels. It is not a production government system and makes no accreditation claim.

- Private S3 buckets block public access and require TLS. CloudFront accesses site objects using origin access control. The application has no public image-read API.
- Lambda permissions scope storage and DynamoDB access to this stack and Bedrock inference to one regional model. Textract DetectDocumentText requires a wildcard resource because it has no document resource ARN.
- A generated Secrets Manager code stays server-side. HMAC-signed session cookies have Secure, HttpOnly, SameSite=Strict and eight-hour expiry. Shared-code access is intentionally simple; there are no individual identities or attribution guarantees.
- Login attempts are limited per hashed source IP/minute. The API also requires JSON and a custom header, sends no CORS permission, and uses noncached responses. Same-site cookies and denied cross-origin preflights protect the browser workflow.
- Strict schema, 2 MB compressed image limit, 20 megapixel decode limit, JPEG/PNG magic validation, animation rejection, EXIF normalization, metadata stripping. Decoding still depends on native libraries; maintain patched Sharp/libvips versions.
- At most 2,000 live attempts per deployment, 1,000 per day and 500 per session, enforced in one DynamoDB transaction before paid calls. Failed calls consume capacity. These cap application AI attempts, not all possible AWS costs. API and CloudFront traffic can incur charges independently.
- SHA-256 idempotency includes image, expectations and version, scoped to session. Conditional leases suppress duplicate concurrent work and permit recovery after a dead worker. Results logically expire after 24 hours.
- Images have a one-day S3 lifecycle; DynamoDB TTL deletion and S3 lifecycle execution are asynchronous. Physical data may remain after logical expiry. CloudWatch logs retain seven days; image text, access codes and model transcripts are not logged.
- Image instructions are treated as untrusted data; extraction has no tools. Server validation and OCR corroboration reduce unsupported findings; they do not constitute a proof against every model attack.
- Exports quote CSV cells and neutralize spreadsheet formula prefixes. React escapes displayed text; no user HTML is rendered.

Risks: shared-code redistribution, a malicious authorized reviewer exhausting allowance, static/API traffic abuse, model/OCR correlated errors, long-tail illegibility and lack of durable batch processing. Access code rotation invalidates sessions once Lambda secret caches refresh; redeploy/restart the function after rotation for immediate enforcement. No billing hard cap or web application firewall is claimed.
