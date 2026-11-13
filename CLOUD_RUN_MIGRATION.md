# Sampada → GCP Cloud Run Migration Guide

## 📋 Overview
This document tracks the migration of Sampada (Rails API) from self-hosted VM to **GCP Cloud Run (asia-south1 Mumbai)** with:
- **Cloud SQL (PostgreSQL)** for database
- **Upstash Redis** for caching/Sidekiq
- **Secret Manager** for all secrets
- **VPC Connector** for private connectivity
- **Artifact Registry** for Docker images

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GCP Project                               │
├─────────────────────────────────────────────────────────────────┤
│  Cloud Run (asia-south1)                                        │
│  ┌─────────────┐    ┌─────────────┐                             │
│  │  sampada    │    │ sampada-    │                             │
│  │  (API)      │    │  sidekiq    │                             │
│  │  1 vCPU     │    │  0.5 vCPU   │                             │
│  │  1 GiB RAM  │    │  512 MiB    │                             │
│  │  min: 0     │    │  min: 0     │                             │
│  │  max: 10    │    │  max: 5     │                             │
│  └──────┬──────┘    └──────┬──────┘                             │
│         │                  │                                     │
│         └────────┬─────────┘                                     │
│                  ▼                                              │
│  ┌─────────────────────────────────────────┐                    │
│  │         VPC Connector (Serverless VPC)  │                    │
│  └────────────────────┬────────────────────┘                    │
│                       │                                          │
│         ┌─────────────┼─────────────┐                            │
│         ▼             ▼             ▼                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Cloud SQL│  │ Upstash  │  │ Secret   │                       │
│  │(Postgres)│  │  Redis   │  │ Manager  │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Files Created

| File | Purpose |
|------|---------|
| `Dockerfile.cloudrun` | Multi-stage optimized Dockerfile |
| `docker-entrypoint.cloudrun.sh` | Cloud Run entrypoint with DB wait |
| `config/puma.rb` | Puma config for Cloud Run (1 worker, 80 threads) |
| `config/database.yml` | Updated for Cloud SQL Unix socket |
| `app/controllers/rails/health_controller.rb` | `/up` health endpoint |
| `config/routes.rb` | Route for health check |
| `cloudbuild.yaml` | CI/CD pipeline for Cloud Build |
| `service.yaml` | Declarative Cloud Run service config |
| `.github/workflows/cloudrun-deploy.yml` | GitHub Actions deployment |
| `.gcloudignore` | Excludes from build context |
| `CLOUD_RUN_MIGRATION.md` | This document |

---

## 🔐 Required from You (Checklist)

### 1. GCP Project Setup
- [ ] **GCP Project ID**: `your-project-id`
- [ ] **Billing enabled** on project
- [ ] **APIs enabled**: Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Cloud Build, VPC Access

### 2. Cloud SQL (PostgreSQL)
- [ ] **Instance created**: `asia-south1` (Mumbai)
- [ ] **Connection name**: `your-project:asia-south1:instance-name`
- [ ] **Database**: `sampada_production`
- [ ] **User**: `sampada` with password
- [ ] **Private IP** enabled (for VPC connector)
- [ ] **SSL mode**: `require`

### 3. Upstash Redis
- [ ] **Redis URL**: `redis://user:pass@host:port/0`
- [ ] **Region**: `asia-south1` (or closest)
- [ ] **TLS enabled**: Yes

### 4. Secret Manager Secrets
Create these secrets in Secret Manager:

| Secret Name | Key | Value |
|-------------|-----|-------|
| `sampada-secrets` | `database-url` | `postgresql://user:pass@/sampada_production?host=/cloudsql/your-project:asia-south1:instance` |
| `sampada-secrets` | `redis-url` | `redis://user:pass@host:port/0` |
| `sampada-secrets` | `secret-key-base` | `rails secret output (64+ chars)` |
| `sampada-secrets` | `encryption-primary-key` | `openssl rand -hex 32` |
| `sampada-secrets` | `encryption-deterministic-key` | `openssl rand -hex 32` |
| `sampada-secrets` | `encryption-key-derivation-salt` | `openssl rand -hex 32` |
| `sampada-secrets` | `google-client-id` | `xxx.apps.googleusercontent.com` |
| `sampada-secrets` | `google-client-secret` | `GOCSPX-xxx` |
| `sampada-secrets` | `app-domain` | `sampada.vayalabs.in` |
| `sampada-secrets` | `cors-origins` | `https://sampada.vayalabs.in` |
| `sampada-secrets` | `smtp-address` | `smtp.sendgrid.net` |
| `sampada-secrets` | `smtp-port` | `587` |
| `sampada-secrets` | `smtp-username` | `apikey` |
| `sampada-secrets` | `smtp-password` | `SG.xxx` |
| `sampada-secrets` | `smtp-tls-enabled` | `true` |
| `sampada-secrets` | `better-auth-verify-url` | `https://auth.yourdomain.com/api/auth/verify` |
| `sampada-secrets` | `better-auth-app-id` | `sampada` |
| `sampada-secrets` | `better-auth-cache-ttl` | `300` |

### 5. VPC & Networking
- [ ] **VPC Network**: `default` or custom
- [ ] **Serverless VPC Connector**: `projects/your-project/locations/asia-south1/connectors/sampada-vpc`
- [ ] **IP Range**: `/28` (16 IPs minimum)
- [ ] **Cloud SQL Private IP** in same VPC

### 6. Service Account
- [ ] **Create SA**: `sampada-cloudrun@your-project.iam.gserviceaccount.com`
- [ ] **Roles**:
  - `Cloud SQL Client`
  - `Secret Manager Secret Accessor`
  - `Cloud Trace Agent`
  - `Logging Writer`
  - `Monitoring Metric Writer`

### 7. Artifact Registry
- [ ] **Repository**: `sampada-docker` (Docker format, `asia-south1`)

### 8. GitHub Secrets (for Actions)
| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | `your-project-id` |
| `GCP_SA_KEY` | Service account JSON key (with Cloud Run Admin, Cloud Build Editor, Artifact Registry Writer, Secret Manager Accessor) |

### 9. Domain & SSL
- [ ] **Custom domain**: `sampada.vayalabs.in` mapped to Cloud Run
- [ ] **SSL**: Managed by Cloud Run (auto)

---

## 🚀 Deployment Steps

### Option 1: GitHub Actions (Recommended)
1. Add all GitHub secrets above
2. Push to `main` branch
3. Watch Actions tab for deployment

### Option 2: Manual Cloud Build
```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_CLOUD_SQL_CONNECTION_NAME="your-project:asia-south1:instance",_DB_PASSWORD="xxx",_SECRET_KEY_BASE="xxx"...
```

### Option 3: Declarative (service.yaml)
```bash
gcloud run services replace service.yaml --region=asia-south1
```

---

## 💰 Cost Estimate (Monthly)

| Component | Free Tier | Beyond Free Tier |
|-----------|-----------|------------------|
| Cloud Run (API) | 2M req, 360k vCPU-s, 180k GiB-s | ~$3-5 at 1M req/mo |
| Cloud Run (Sidekiq) | Same pool | ~$1-2 |
| Cloud SQL (db-f1-micro) | 1 instance free (12mo) | ~$7-15/mo |
| Upstash Redis | 10k cmd/day free | ~$0-5 |
| Artifact Registry | 0.5 GiB free | ~$0.10/GiB |
| Cloud Build | 120 min/day free | ~$0.003/min |
| Secret Manager | 6 secret versions free | ~$0.06/version |
| **Total (typical)** | **$0** | **~$10-25/mo** |

---

## 🔧 Post-Migration Tasks

- [ ] Update frontend `VITE_API_URL` to new Cloud Run URL
- [ ] Update Better Auth `BETTER_AUTH_VERIFY_URL` if changed
- [ ] Configure Cloud Run custom domain
- [ ] Set up Cloud Monitoring alerts (latency, errors, CPU)
- [ ] Configure Cloud Logging sinks
- [ ] Run load test (hey/locust) to validate autoscaling
- [ ] Update DNS records

---

## 📝 Notes

1. **Cold starts**: ~100-300ms for Rails. Mitigate with `--min-instances=1` if needed (~$7/mo)
2. **Database connections**: Cloud Run concurrency=80, set `RAILS_MAX_THREADS=80`, DB pool=5-10
3. **Sidekiq**: Separate service, no HTTP ingress, scales independently
4. **Secrets**: Never put in env vars directly - use Secret Manager references
5. **VPC Connector**: Required for Cloud SQL private IP + Upstash private endpoint (if using)

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| `db:migrate` fails | Check Cloud SQL proxy, DB_SOCKET, secret values |
| Cold start too slow | Enable `--min-instances=1`, check `startup-cpu-boost` |
| 502 errors | Check health endpoint `/up`, startup probe timeout |
| Sidekiq not processing | Check REDIS_URL, VPC connector, Upstash allowlist |
| Secret not found | Verify secret name/key matches `valueFrom.secretKeyRef` |

---

## 📞 Next Steps

1. **You provide**: All checklist items above
2. **I'll**: Run initial deployment, validate health checks
3. **We**: Load test, tune autoscaling, cut over DNS

**Estimated timeline**: 1-2 days once all secrets/infra ready