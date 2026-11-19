# Security Policy — Sampada

## Supported Versions
Only the latest deployed version of Sampada receives security updates.

## Reporting a Vulnerability
We take security seriously. If you discover a security vulnerability, please report it privately:

**Email:** sdachary@gmail.com

**Do not** file a public GitHub issue or discuss the vulnerability in public forums.

### What to include:
- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential impact

### Response timeline:
- **24 hours:** Acknowledgment of receipt
- **7 days:** Initial assessment and remediation plan
- **30 days:** Fix deployed (or rationale for extended timeline)

## Security Practices
- HTTPS at the Cloudflare edge with HSTS (`frontend/public/_headers`); no plaintext origin hop
- Passkey-first authentication with magic-link recovery; D1 sessions in the `sampada_session` cookie
- Turnstile verifies magic-link requests; edge honeypot in the Pages proxy
- Per-user ownership scoping plus household role checks in the Worker (`originGuard`, `requireAuth`)
- Rate limiting at the edge and origin guard on every `/api/v1/*` router
- Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `D1_PROBE_TOKEN`) held in Worker secrets / SOPS, never in git
- Content Security Policy headers enforced (Cloudflare Pages `_headers`)
- No hardcoded secrets in client-side code

## Bug Bounty
We do not currently offer a bug bounty program.
