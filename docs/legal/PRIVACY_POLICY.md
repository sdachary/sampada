# Privacy Policy — Sampada

**Last updated:** June 3, 2026

> **Note:** The live, user-facing policy is `frontend/public/privacy.html` (AcharyaLab DPDP Act 2023 template — served at `/privacy.html` by Cloudflare Pages). This Markdown copy tracks the same facts for the repo; keep the two in sync.

## 1. Information We Collect

### 1.1 Information You Provide
Account details (name, email), financial data (transactions, accounts, partners), and uploaded documents.

### 1.2 Information Collected Automatically
- Usage data (pages visited, features used, session duration)
- Device and browser information
- IP address and approximate location

### 1.3 Payment Information
We do not process payments directly. Payment processing is handled by N/A (no payments integrated) and we do not store full payment card details.

## 2. How We Use Your Information
- To provide and maintain the Service
- To process transactions and send related communications
- To improve and personalize the Service
- To communicate with you about updates, security, and support
- To detect and prevent fraud or abuse

## 3. Third-Party Services

We use the following third-party services:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Cloudflare Inc. | API hosting (Workers), database (D1), file storage (R2), CDN, DNS, DDoS protection | Account details, financial records, uploaded documents, IP address, request metadata |
| Resend | Transactional email delivery (magic-link sign-in, notifications) | Email address |

Each third-party service has its own privacy policy governing the use of your data.

## 4. Data Storage & Security
- Data is stored in Cloudflare D1 (SQLite) and R2 object storage, replicated across Cloudflare's edge network (which may include locations outside India)
- Encryption in transit (HTTPS/TLS at the edge) and at rest (Cloudflare-managed)
- Per-user ownership scoping and household role checks in the Worker restrict data access; secrets are held in Worker secrets / SOPS
- Backups are retained in R2 / D1 exports for rollback

## 5. Data Retention
We retain your data for as long as your account is active. After account deletion, data is purged within 30 days unless required for legal or compliance purposes.

## 6. Your Rights (GDPR)
If you are in the EEA, you have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data ("right to be forgotten")
- Restrict or object to processing
- Data portability
- Withdraw consent at any time

To exercise these rights: sdachary@gmail.com

## 7. Cookies
We use essential cookies for authentication and session management. We do not use tracking cookies or third-party analytics cookies.

## 8. Children's Privacy
The Service is not intended for users under 18. We do not knowingly collect data from children.

## 9. Changes to This Policy
We may update this policy. Material changes will be communicated via email or in-app notification.

## 10. Contact
Sampada<br>
sdachary@gmail.com
