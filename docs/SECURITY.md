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
- HTTPS at the Cloudflare edge (HSTS via `_headers`); **edge→origin is plaintext HTTP on nip.io** — known gap, verified in `SAMPADA_UAT_TRACKER.md` (SEC-03)
- Authentication via the shared **Better-Auth** service (email/password; JWT verified per request)
- **Pundit policies** enforce per-user data isolation at the application layer
- Rate limiting on auth and API endpoints (Rack::Attack)
- Regular dependency updates, Brakeman + bundler-audit + gitleaks in CI
- Content Security Policy headers enforced (Cloudflare Pages `_headers`)
- No hardcoded secrets in client-side code

## Bug Bounty
We do not currently offer a bug bounty program.
