# 📋 GCP Infrastructure Setup Guide for Sampada Cloud Run Migration

**Prerequisites**: You have a GCP Project ID (e.g., `my-sampada-project`)

---

## 🎯 Quick Overview

| Step | Task | Time | Method |
|------|------|------|--------|
| 1 | Enable APIs | 2 min | `gcloud` or Console |
| 2 | Create Artifact Registry | 2 min | `gcloud` |
| 3 | Create Cloud SQL (PostgreSQL) | 5 min | `gcloud` |
| 4 | Create Upstash Redis | 3 min | Upstash Console |
| 5 | Create VPC Connector | 5 min | `gcloud` |
| 6 | Create Service Account | 3 min | `gcloud` |
| 7 | Create 19 Secrets | 10 min | `gcloud` |
| 8 | Add GitHub Secrets | 3 min | GitHub Settings |
| **Total** | **~30 minutes** | | |

---

## 1️⃣ Enable Required APIs

Run in Cloud Shell or local terminal with `gcloud` authenticated:

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  vpcaccess.googleapis.com \
  iam.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com \
  cloudtrace.googleapis.com

# Verify
gcloud services list --enabled --filter="name:(run OR sqladmin OR artifactregistry OR secretmanager OR cloudbuild OR vpcaccess)"
```

---

## 2️⃣ Create Artifact Registry (Docker Repository)

```bash
export REGION="asia-south1"
export REPO_NAME="sampada-docker"

gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Sampada Docker images"

# Verify
gcloud artifacts repositories list --location=$REGION
```

**Output**: Repository URL like `asia-south1-docker.pkg.dev/your-project/sampada-docker`

---

## 3️⃣ Create Cloud SQL (PostgreSQL)

```bash
export INSTANCE_NAME="sampada-db"
export DB_NAME="sampada_production"
export DB_USER="sampada"
export REGION="asia-south1"

# Generate a strong password (save this!)
export DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "DB_PASSWORD=$DB_PASSWORD"  # COPY THIS!

# Create instance (uses private IP, no public IP)
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --region=$REGION \
  --cpu=1 \
  --memory=3840MiB \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --network=default \
  --no-assign-ip \
  --enable-google-private-path \
  --deletion-protection \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --labels=app=sampada,env=production

# Create database
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME

# Create user
gcloud sql users create $DB_USER \
  --instance=$INSTANCE_NAME \
  --password=$DB_PASSWORD

# Get connection name (needed for Cloud Run)
gcloud sql instances describe $INSTANCE_NAME --format="value(connectionName)"
# Output: your-project:asia-south1:sampada-db  ← SAVE THIS!
```

**Important outputs to save:**
- `CONNECTION_NAME` = `your-project:asia-south1:sampada-db`
- `DB_PASSWORD` = (the generated password)

---

## 4️⃣ Create Upstash Redis (Free Tier)

### Option A: Via Upstash Console (Recommended)

1. Go to **https://console.upstash.com/redis**
2. Click **"Create Database"**
3. Configure:
   - **Name**: `sampada-redis`
   - **Region**: `Asia Pacific (Mumbai)` or closest
   - **Type**: `Free` (10k commands/day, 256 MB)
   - **TLS**: ✅ Enabled
   - **Eviction**: `allkeys-lru`
4. Click **Create**
5. Copy the **Redis URL** (format: `rediss://default:password@host:port`)

### Option B: Via Upstash CLI (if you have it)

```bash
# Install Upstash CLI
npm install -g @upstash/cli

# Login and create
upstash login
upstash redis create sampada-redis --region ap-south-1 --tls
```

**Save the Redis URL** - you'll need it for secrets.

---

## 5️⃣ Create VPC Connector (Serverless VPC Access)

```bash
export VPC_CONNECTOR="sampada-vpc"
export REGION="asia-south1"
export NETWORK="default"
export IP_RANGE="10.8.0.0/28"  # Must be /28, unused in your VPC

gcloud compute networks vpc-access connectors create $VPC_CONNECTOR \
  --region=$REGION \
  --network=$NETWORK \
  --range=$IP_RANGE \
  --min-instances=2 \
  --max-instances=10

# Verify (wait for READY state)
gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR --region=$REGION
```

**Wait 2-3 minutes** for status to become `READY`.

**Save the full connector name:**
```
projects/your-project/locations/asia-south1/connectors/sampada-vpc
```

---

## 6️⃣ Create Service Account for Cloud Run

```bash
export SA_NAME="sampada-cloudrun"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="Sampada Cloud Run Service Account" \
  --description="Runs Sampada API and Sidekiq on Cloud Run"

# Grant required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudtrace.agent"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/monitoring.metricWriter"

# Verify
gcloud iam service-accounts get-iam-policy $SA_EMAIL
```

---

## 7️⃣ Create All 19 Secrets in Secret Manager

### 7.1 Generate Encryption Keys First

```bash
# Run these locally and save outputs!
export SECRET_KEY_BASE=$(rails secret)  # or: openssl rand -hex 64
export ENC_PRIMARY=$(openssl rand -hex 32)
export ENC_DETERMINISTIC=$(openssl rand -hex 32)
export ENC_SALT=$(openssl rand -hex 32)

echo "SECRET_KEY_BASE=$SECRET_KEY_BASE"
echo "ENC_PRIMARY=$ENC_PRIMARY"
echo "ENC_DETERMINISTIC=$ENC_DETERMINISTIC"
echo "ENC_SALT=$ENC_SALT"
```

### 7.2 Create the Secret (single secret with multiple versions/keys)

```bash
# Create the secret container
gcloud secrets create sampada-secrets \
  --replication-policy="automatic" \
  --labels=app=sampada,env=production
```

### 7.3 Add Each Secret Version (19 total)

**Replace the placeholder values with your actual values:**

```bash
# 1. Database URL (with Cloud SQL Unix socket)
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "postgresql://sampada:YOUR_DB_PASSWORD@/sampada_production?host=/cloudsql/YOUR_CONNECTION_NAME")

# 2. Redis URL (from Upstash)
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "rediss://default:YOUR_UPSTASH_PASSWORD@YOUR_UPSTASH_HOST:6379")

# 3. Rails Secret Key Base
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "YOUR_SECRET_KEY_BASE")

# 4. Encryption Primary Key
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "YOUR_ENC_PRIMARY")

# 5. Encryption Deterministic Key
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "YOUR_ENC_DETERMINISTIC")

# 6. Encryption Key Derivation Salt
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "YOUR_ENC_SALT")

# 7. Google OAuth Client ID
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")

# 8. Google OAuth Client Secret
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "GOCSPX-YOUR_GOOGLE_CLIENT_SECRET")

# 9. App Domain
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "sampada.vayalabs.in")

# 10. CORS Origins
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "https://sampada.vayalabs.in")

# 11. SMTP Address
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "smtp.sendgrid.net")

# 12. SMTP Port
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "587")

# 13. SMTP Username
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "apikey")

# 14. SMTP Password (SendGrid API key)
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "SG.YOUR_SENDGRID_API_KEY")

# 15. SMTP TLS Enabled
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "true")

# 16. Better Auth Verify URL
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "https://auth.yourdomain.com/api/auth/verify")

# 17. Better Auth App ID
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "sampada")

# 18. Better Auth Cache TTL
gcloud secrets versions add sampada-secrets \
  --data-file=<(echo -n "300")

# 19. (Optional) Previous encryption keys for rotation - skip for now
```

### 7.4 Grant Service Account Access to Secrets

```bash
export SA_EMAIL="sampada-cloudrun@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding sampada-secrets \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 8️⃣ Add GitHub Repository Secrets

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | `your-project-id` |
| `GCP_SA_KEY` | **Service Account JSON** (see below) |

### Create Service Account Key for GitHub Actions

```bash
# Create a dedicated SA for GitHub Actions (or reuse sampada-cloudrun with extra roles)
export GH_SA="github-actions-deploy"
export GH_SA_EMAIL="${GH_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $GH_SA \
  --display-name="GitHub Actions Deploy"

# Grant roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GH_SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GH_SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GH_SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GH_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GH_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-sa-key.json \
  --iam-account=$GH_SA_EMAIL

# Copy the ENTIRE JSON content to GitHub secret GCP_SA_KEY
cat github-sa-key.json
```

---

## ✅ Verification Checklist

After completing all steps, verify:

```bash
# 1. APIs enabled
gcloud services list --enabled --project=$PROJECT_ID --filter="name:(run OR sqladmin OR artifactregistry OR secretmanager OR cloudbuild OR vpcaccess)"

# 2. Artifact Registry
gcloud artifacts repositories describe sampada-docker --location=asia-south1

# 3. Cloud SQL
gcloud sql instances describe sampada-db --format="value(connectionName,ipAddresses[0].ipAddress)"

# 4. VPC Connector
gcloud compute networks vpc-access connectors describe sampada-vpc --region=asia-south1 --format="value(state)"

# 5. Service Account
gcloud iam service-accounts describe sampada-cloudrun@${PROJECT_ID}.iam.gserviceaccount.com

# 6. Secrets (should show 18 versions)
gcloud secrets versions list sampada-secrets --limit=20

# 7. Secret access
gcloud secrets get-iam-policy sampada-secrets
```

---

## 📝 Summary of Values to Save

| Variable | Your Value |
|----------|------------|
| `PROJECT_ID` | |
| `CONNECTION_NAME` | `your-project:asia-south1:sampada-db` |
| `DB_PASSWORD` | |
| `REDIS_URL` | `rediss://default:xxx@xxx:6379` |
| `VPC_CONNECTOR` | `projects/your-project/locations/asia-south1/connectors/sampada-vpc` |
| `SA_EMAIL` | `sampada-cloudrun@your-project.iam.gserviceaccount.com` |
| `GH_SA_KEY_JSON` | (full JSON content) |

---

## 🚀 Next Step

Once all above are done, share the **Connection Name**, **Redis URL**, and confirm secrets are created. Then I'll help you trigger the first deployment!

**Estimated time**: 30-45 minutes if doing manually, faster if using the `gcloud` commands above.