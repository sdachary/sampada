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
| Better-Auth (AcharyaLab shared service) | Authentication (email/password, JWT) | Account data |
| Cloudflare Inc. | CDN, DNS, DDoS protection | IP address, request metadata |
| N/A (no payments integrated) | Payment processing | Payment details (PCI-DSS compliant) |
| PostgreSQL | Database storage (self-hosted) | All user data

Each third-party service has its own privacy policy governing the use of your data.

## 4. Data Storage & Security
- Data is stored in a self-hosted PostgreSQL 16 database on servers in India
- We implement encryption in transit (HTTPS at the edge) and at rest (Active Record encryption)
- Access controls and application-level authorization (Pundit policies) restrict data access
- Backups are performed daily with 7-day retention

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
