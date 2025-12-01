# GCP Deployment Guide

This guide covers deploying the Thesis Validator application (backend + frontend) to Google Cloud Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [GCP Project Setup](#gcp-project-setup)
- [Backend Deployment (Cloud Run)](#backend-deployment-cloud-run)
- [Frontend Deployment (Cloud Storage + Cloud CDN)](#frontend-deployment-cloud-storage--cloud-cdn)
- [CI/CD with Cloud Build](#cicd-with-cloud-build)
- [Monitoring and Observability](#monitoring-and-observability)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Docker (for local testing)
# https://docs.docker.com/get-docker/

# Node.js 20+
nvm install 20
nvm use 20
```

### Required APIs

Enable these APIs in your GCP project:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  redis.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  aiplatform.googleapis.com
```

### Required API Keys

- **OpenAI API Key** - For embeddings (`text-embedding-3-large`)
- **Tavily API Key** - For web search capabilities
- **JWT Secret** - For authentication (generate a secure 32+ character string)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Google Cloud Platform                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐      ┌────────────────────────────────────┐    │
│  │   Cloud CDN     │      │         Cloud Run                  │    │
│  │   + Storage     │      │    (thesis-validator API)          │    │
│  │  (dashboard-ui) │      │                                    │    │
│  └────────┬────────┘      └────────────────┬───────────────────┘    │
│           │                                │                         │
│           │           ┌────────────────────┼──────────────────┐     │
│           │           │                    │                  │     │
│           │    ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼────┐│
│           │    │ Memorystore │    │  Cloud SQL    │   │ Vertex AI ││
│           │    │   (Redis)   │    │ (PostgreSQL)  │   │  Claude   ││
│           │    └─────────────┘    └───────────────┘   └───────────┘│
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ Secret Manager  │  (API keys, JWT secret)                       │
│  └─────────────────┘                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## GCP Project Setup

### 1. Set Environment Variables

```bash
# Set your project configuration
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="thesis-validator"

# Authenticate and set project
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create $SERVICE_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Thesis Validator container images"
```

### 3. Create Secrets in Secret Manager

```bash
# Create secrets (you'll be prompted for values)
echo -n "your-jwt-secret-at-least-32-chars" | \
  gcloud secrets create thesis-validator-jwt-secret --data-file=-

echo -n "sk-your-openai-api-key" | \
  gcloud secrets create openai-api-key --data-file=-

echo -n "tvly-your-tavily-api-key" | \
  gcloud secrets create tavily-api-key --data-file=-
```

### 4. Set Up Memorystore for Redis

```bash
# Create a VPC connector for Cloud Run to access Redis
gcloud compute networks vpc-access connectors create thesis-validator-connector \
  --region=$REGION \
  --range=10.8.0.0/28

# Create Redis instance
gcloud redis instances create thesis-validator-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=basic

# Get the Redis host (save this for later)
gcloud redis instances describe thesis-validator-redis \
  --region=$REGION \
  --format="value(host)"
```

### 5. Set Up Cloud SQL for PostgreSQL

```bash
# Create Cloud SQL instance
gcloud sql instances create thesis-validator-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-g1-small \
  --region=$REGION \
  --storage-auto-increase \
  --storage-size=10GB

# Create database
gcloud sql databases create thesis_validator \
  --instance=thesis-validator-postgres

# Create user
gcloud sql users create thesis_validator \
  --instance=thesis-validator-postgres \
  --password="YOUR_SECURE_PASSWORD"

# Store password in Secret Manager
echo -n "YOUR_SECURE_PASSWORD" | \
  gcloud secrets create thesis-validator-db-password --data-file=-
```

### 6. Grant IAM Permissions

```bash
# Get the Cloud Build and Cloud Run service accounts
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
export CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Cloud Build permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

# Cloud Run permissions for secrets
gcloud secrets add-iam-policy-binding thesis-validator-jwt-secret \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding tavily-api-key \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding thesis-validator-db-password \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

# Vertex AI permissions for Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/aiplatform.user"
```

---

## Backend Deployment (Cloud Run)

### Option A: Manual Deployment

#### 1. Build and Push Docker Image

```bash
cd thesis-validator

# Configure Docker for Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and tag the image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${SERVICE_NAME}:latest .

# Push to Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${SERVICE_NAME}:latest
```

#### 2. Deploy to Cloud Run

```bash
# Get Redis host
REDIS_HOST=$(gcloud redis instances describe thesis-validator-redis \
  --region=$REGION --format="value(host)")

# Get Cloud SQL connection name
SQL_CONNECTION=$(gcloud sql instances describe thesis-validator-postgres \
  --format="value(connectionName)")

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${SERVICE_NAME}:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --concurrency=80 \
  --vpc-connector=thesis-validator-connector \
  --add-cloudsql-instances=${SQL_CONNECTION} \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="LLM_PROVIDER=vertex-ai" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars="GOOGLE_CLOUD_REGION=${REGION}" \
  --set-env-vars="REDIS_URL=redis://${REDIS_HOST}:6379" \
  --set-env-vars="DATABASE_URL=postgresql://thesis_validator:PASSWORD@/thesis_validator?host=/cloudsql/${SQL_CONNECTION}" \
  --set-secrets="JWT_SECRET=thesis-validator-jwt-secret:latest" \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
  --set-secrets="TAVILY_API_KEY=tavily-api-key:latest"
```

#### 3. Verify Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION --format="value(status.url)")

# Test health endpoint
curl ${SERVICE_URL}/health
```

### Option B: Using Cloud Build (Recommended)

The project includes a `cloudbuild.yaml` that automates the entire CI/CD pipeline.

```bash
# Trigger a build manually
cd thesis-validator
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_REPOSITORY=$SERVICE_NAME,_SERVICE_NAME=$SERVICE_NAME
```

---

## Frontend Deployment (Cloud Storage + Cloud CDN)

### 1. Create Cloud Storage Bucket

```bash
export FRONTEND_BUCKET="${PROJECT_ID}-dashboard-ui"

# Create bucket
gsutil mb -l $REGION gs://${FRONTEND_BUCKET}

# Enable website hosting
gsutil web set -m index.html -e index.html gs://${FRONTEND_BUCKET}

# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://${FRONTEND_BUCKET}
```

### 2. Build and Deploy Frontend

```bash
cd dashboard-ui

# Install dependencies
npm ci

# Create production environment file
cat > .env.production << EOF
VITE_API_URL=https://${SERVICE_NAME}-HASH-uc.a.run.app
EOF

# Build for production
npm run build

# Upload to Cloud Storage
gsutil -m rsync -r -d dist/ gs://${FRONTEND_BUCKET}/
```

### 3. Set Up Cloud CDN with Load Balancer

```bash
# Create backend bucket
gcloud compute backend-buckets create dashboard-ui-backend \
  --gcs-bucket-name=${FRONTEND_BUCKET} \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC

# Create URL map
gcloud compute url-maps create dashboard-ui-lb \
  --default-backend-bucket=dashboard-ui-backend

# Create HTTP proxy
gcloud compute target-http-proxies create dashboard-ui-proxy \
  --url-map=dashboard-ui-lb

# Create forwarding rule (this creates a public IP)
gcloud compute forwarding-rules create dashboard-ui-http \
  --global \
  --target-http-proxy=dashboard-ui-proxy \
  --ports=80

# Get the IP address
gcloud compute forwarding-rules describe dashboard-ui-http \
  --global --format="value(IPAddress)"
```

### 4. (Optional) Set Up HTTPS with Managed SSL

```bash
export DOMAIN="your-domain.com"

# Create managed SSL certificate
gcloud compute ssl-certificates create dashboard-ui-cert \
  --domains=$DOMAIN \
  --global

# Create HTTPS proxy
gcloud compute target-https-proxies create dashboard-ui-https-proxy \
  --url-map=dashboard-ui-lb \
  --ssl-certificates=dashboard-ui-cert

# Create HTTPS forwarding rule
gcloud compute forwarding-rules create dashboard-ui-https \
  --global \
  --target-https-proxy=dashboard-ui-https-proxy \
  --ports=443
```

### Alternative: Firebase Hosting (Simpler)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
cd dashboard-ui
firebase init hosting

# Deploy
npm run build
firebase deploy --only hosting
```

---

## CI/CD with Cloud Build

### 1. Connect GitHub Repository

```bash
# Install Cloud Build GitHub App
# Visit: https://github.com/apps/google-cloud-build

# Create trigger for main branch
gcloud builds triggers create github \
  --name="thesis-validator-main" \
  --repo-owner="your-org" \
  --repo-name="nextgen-CDD" \
  --branch-pattern="^main$" \
  --build-config="thesis-validator/cloudbuild.yaml" \
  --substitutions="_REGION=${REGION},_REPOSITORY=${SERVICE_NAME},_SERVICE_NAME=${SERVICE_NAME}"
```

### 2. Create Frontend Build Trigger

Create `dashboard-ui/cloudbuild.yaml`:

```yaml
steps:
  - id: 'install'
    name: 'node:20-alpine'
    dir: 'dashboard-ui'
    entrypoint: 'npm'
    args: ['ci']

  - id: 'build'
    name: 'node:20-alpine'
    dir: 'dashboard-ui'
    entrypoint: 'npm'
    args: ['run', 'build']
    env:
      - 'VITE_API_URL=https://${_API_URL}'

  - id: 'deploy'
    name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'rsync', '-r', '-d', 'dashboard-ui/dist/', 'gs://${_BUCKET}/']

  - id: 'invalidate-cache'
    name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args: ['compute', 'url-maps', 'invalidate-cdn-cache', 'dashboard-ui-lb', '--path', '/*']

substitutions:
  _BUCKET: 'your-project-id-dashboard-ui'
  _API_URL: 'thesis-validator-xxx-uc.a.run.app'

timeout: '600s'
```

---

## Monitoring and Observability

### 1. View Logs

```bash
# Stream Cloud Run logs
gcloud run services logs read $SERVICE_NAME --region=$REGION --tail=100

# Or use Cloud Console
# https://console.cloud.google.com/run
```

### 2. Set Up Alerts

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --display-name="Thesis Validator Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="thesis-validator" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class!="2xx"'
```

### 3. View Metrics

Access Cloud Monitoring:
- Cloud Run: https://console.cloud.google.com/run
- Cloud SQL: https://console.cloud.google.com/sql
- Memorystore: https://console.cloud.google.com/memorystore

---

## Troubleshooting

### Common Issues

#### 1. Cloud Run can't connect to Redis

**Symptom**: Connection refused errors to Redis

**Solution**: Ensure VPC connector is properly configured:

```bash
# Verify VPC connector exists
gcloud compute networks vpc-access connectors describe thesis-validator-connector \
  --region=$REGION

# Redeploy with VPC connector
gcloud run services update $SERVICE_NAME \
  --vpc-connector=thesis-validator-connector \
  --region=$REGION
```

#### 2. Cloud SQL connection fails

**Symptom**: Database connection errors

**Solution**: Check Cloud SQL instance and connection:

```bash
# Verify instance is running
gcloud sql instances describe thesis-validator-postgres

# Test connection via Cloud SQL Proxy (locally)
./cloud_sql_proxy -instances=${SQL_CONNECTION}=tcp:5432
```

#### 3. Secret access denied

**Symptom**: Permission denied accessing secrets

**Solution**: Grant secret accessor role:

```bash
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

#### 4. Vertex AI Claude access denied

**Symptom**: 403 errors when calling Claude via Vertex AI

**Solution**:
1. Ensure Vertex AI API is enabled
2. Request Claude model access in GCP Console
3. Grant IAM role:

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/aiplatform.user"
```

#### 5. Cold starts are slow

**Solution**: Set minimum instances:

```bash
gcloud run services update $SERVICE_NAME \
  --min-instances=1 \
  --region=$REGION
```

---

## Cost Optimization

### Recommended Settings for Development/Staging

```bash
gcloud run deploy $SERVICE_NAME-staging \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --region=$REGION
```

### Production Considerations

- Use committed use discounts for Cloud SQL
- Enable Cloud Run CPU allocation only during requests
- Use Cloud CDN for frontend to reduce egress costs
- Set appropriate `max-instances` to control costs

---

## Quick Reference

| Component | Service | Console URL |
|-----------|---------|-------------|
| Backend API | Cloud Run | https://console.cloud.google.com/run |
| Frontend | Cloud Storage | https://console.cloud.google.com/storage |
| Database | Cloud SQL | https://console.cloud.google.com/sql |
| Cache | Memorystore | https://console.cloud.google.com/memorystore |
| Secrets | Secret Manager | https://console.cloud.google.com/security/secret-manager |
| Images | Artifact Registry | https://console.cloud.google.com/artifacts |
| CI/CD | Cloud Build | https://console.cloud.google.com/cloud-build |
| Logs | Cloud Logging | https://console.cloud.google.com/logs |

---

## Next Steps

1. Set up a custom domain with Cloud DNS
2. Configure Identity-Aware Proxy (IAP) for authentication
3. Set up Cloud Armor for DDoS protection
4. Implement Cloud Trace for distributed tracing
5. Create dashboards in Cloud Monitoring
