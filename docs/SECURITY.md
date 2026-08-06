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
- All traffic encrypted with TLS 1.3
- Authentication via Supabase with PKCE flow
- Row-Level Security (RLS) enforces data isolation
- Rate limiting on auth and API endpoints
- Regular dependency updates
- Content Security Policy headers enforced
- No hardcoded secrets in client-side code

## Bug Bounty
We do not currently offer a bug bounty program.
