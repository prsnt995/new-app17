# NamasteMart - Deployment Guide

**Version:** 1.0  
**Last Updated:** August 2026  
**Environments:** Development, Staging, Production

---

## Table of Contents

1. [Infrastructure Setup](#infrastructure-setup)
2. [Environment Variables](#environment-variables)
3. [Database Deployment](#database-deployment)
4. [Web App Deployment](#web-app-deployment)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Backend Deployment](#backend-deployment)
7. [CDN & Static Assets](#cdn--static-assets)
8. [Monitoring & Logging](#monitoring--logging)
9. [Rollback Procedures](#rollback-procedures)
10. [Deployment Checklists](#deployment-checklists)

---

## Infrastructure Setup

### Cloud Providers Setup

#### AWS (Recommended for Production)
```bash
# Install AWS CLI
brew install awscli

# Configure AWS credentials
aws configure

# Create S3 buckets
aws s3 mb s3://namastemart-assets-prod
aws s3 mb s3://namastemart-backups-prod

# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier namastemart-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username postgres \
  --master-user-password [SECURE_PASSWORD] \
  --allocated-storage 100

# Create Elastic Container Registry (ECR)
aws ecr create-repository --repository-name namastemart-backend
aws ecr create-repository --repository-name namastemart-web
```

#### Firebase (For Real-time Features)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init
```

#### Vercel (For Web App Hosting)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

---

## Environment Variables

### Development (.env.local)
```env
# API
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_API_VERSION=v1

# Authentication
REACT_APP_AUTH_PROVIDER=firebase
REACT_APP_FIREBASE_API_KEY=xxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxx

# Payment Gateways
REACT_APP_STRIPE_KEY=pk_test_xxx
REACT_APP_RAZORPAY_KEY=rzp_test_xxx

# Maps
REACT_APP_GOOGLE_MAPS_API_KEY=xxx

# App Config
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
REACT_APP_APP_VERSION=1.0.0
```

### Staging (.env.staging)
```env
REACT_APP_API_BASE_URL=https://staging-api.namastemart.com/api
REACT_APP_ENV=staging
REACT_APP_LOG_LEVEL=info
```

### Production (.env.production)
```env
REACT_APP_API_BASE_URL=https://api.namastemart.com/api
REACT_APP_ENV=production
REACT_APP_LOG_LEVEL=error
```

### Backend Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/namastemart
DB_POOL_SIZE=20
DB_MAX_IDLE=5

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_xxx
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx

# Email Service
SENDGRID_API_KEY=xxx
FROM_EMAIL=noreply@namastemart.com

# SMS Service
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+xxx

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=namastemart-assets-prod

# Logging
LOG_LEVEL=info
SENTRY_DSN=xxx

# Redis (for caching & sessions)
REDIS_URL=redis://user:password@host:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Maintenance
MAINTENANCE_MODE=false
```

### Secure Management
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name namastemart/prod/db-password \
  --secret-string "your-password"

# Retrieve secrets
aws secretsmanager get-secret-value \
  --secret-id namastemart/prod/db-password
```

---

## Database Deployment

### Initial Setup

```bash
# 1. Connect to database
psql -h your-rds-endpoint.amazonaws.com -U postgres -d namastemart

# 2. Create database
CREATE DATABASE namastemart;
CREATE DATABASE namastemart_staging;

# 3. Create user with limited permissions
CREATE USER namastemart_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE namastemart TO namastemart_user;
```

### Run Migrations

```bash
# Development
npm run db:migrate:dev

# Staging
DATABASE_URL=postgres://... npm run db:migrate:staging

# Production
DATABASE_URL=postgres://... npm run db:migrate:prod
```

### Backup Strategy

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/namastemart"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://namastemart-backups-prod/

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

### Recovery Procedure

```bash
# Restore from backup
gunzip -c backup_20260814_120000.sql.gz | \
  psql -h your-rds-endpoint.amazonaws.com -U postgres -d namastemart

# Verify
psql -h your-rds-endpoint.amazonaws.com -U postgres -d namastemart -c \
  "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM shipments;"
```

---

## Web App Deployment

### Deploy to Vercel

```bash
# Build
npm run build:web

# Deploy to staging
vercel --env-file .env.staging

# Deploy to production
vercel --prod --env-file .env.production
```

### Deploy to Firebase Hosting

```bash
# Build
npm run build:web

# Initialize Firebase (one-time)
firebase init hosting

# Deploy
firebase deploy --only hosting:production
```

### Deploy to AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize
amplify init

# Configure environment
amplify env add production

# Deploy
amplify publish
```

### Docker Deployment

```bash
# Build Docker image
docker build -t namastemart-web:1.0.0 -f Dockerfile.web .

# Tag for ECR
docker tag namastemart-web:1.0.0 \
  123456789.dkr.ecr.us-east-1.amazonaws.com/namastemart-web:1.0.0

# Push to ECR
docker push \
  123456789.dkr.ecr.us-east-1.amazonaws.com/namastemart-web:1.0.0
```

**Dockerfile.web:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:web

# Production stage
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Mobile App Deployment

### iOS Deployment

```bash
# Build for iOS
eas build --platform ios --auto-submit

# Or manual build
npm run build:ios

# Submit to App Store
eas submit --platform ios
```

### Android Deployment

```bash
# Build for Android
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

### EAS Configuration

**eas.json:**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "production": {
      "node": "18.0.0",
      "env": {
        "REACT_APP_ENV": "production",
        "REACT_APP_API_BASE_URL": "https://api.namastemart.com/api"
      }
    },
    "staging": {
      "node": "18.0.0",
      "env": {
        "REACT_APP_ENV": "staging",
        "REACT_APP_API_BASE_URL": "https://staging-api.namastemart.com/api"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccount": "./service-account.json",
        "track": "production"
      }
    }
  }
}
```

---

## Backend Deployment

### Node.js Backend on AWS EC2

```bash
#!/bin/bash
# deploy-backend.sh

cd /opt/namastemart-backend

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Run migrations
npm run db:migrate:prod

# Restart service
sudo systemctl restart namastemart-backend

# Check status
sudo systemctl status namastemart-backend
```

### Docker Deployment

```bash
# Build Docker image
docker build -t namastemart-backend:1.0.0 -f Dockerfile.backend .

# Run container
docker run -d \
  --name namastemart-backend \
  -p 3000:3000 \
  --env-file .env.production \
  namastemart-backend:1.0.0

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/namastemart-backend:1.0.0
```

**Dockerfile.backend:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build if needed
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: namastemart-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: namastemart-backend
  template:
    metadata:
      labels:
        app: namastemart-backend
    spec:
      containers:
      - name: backend
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/namastemart-backend:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: namastemart-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: namastemart-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: namastemart-backend
spec:
  selector:
    app: namastemart-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## CDN & Static Assets

### Configure CloudFront (AWS CDN)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --origin-domain-name namastemart-assets-prod.s3.amazonaws.com

# Invalidate cache after deployment
aws cloudfront create-invalidation \
  --distribution-id E2XXXXXX \
  --paths "/*"
```

### Upload Assets to S3

```bash
#!/bin/bash
# upload-assets.sh

DISTRIBUTION_ID="E2XXXXXX"
BUCKET="namastemart-assets-prod"

# Upload assets
aws s3 sync ./public s3://$BUCKET/assets \
  --delete \
  --cache-control "max-age=31536000"

# Upload app shell with no cache
aws s3 cp ./dist/index.html s3://$BUCKET/ \
  --cache-control "no-cache" \
  --content-type "text/html"

# Invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Assets deployed successfully"
```

---

## Monitoring & Logging

### CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /namastemart/app

# Stream logs
aws logs tail /namastemart/app --follow

# Create metric alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-error-rate \
  --alarm-description "Alert if error rate > 5%" \
  --metric-name ErrorRate \
  --namespace NamasteMart \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Sentry Error Tracking

```bash
# Install Sentry CLI
npm install @sentry/cli

# Create Sentry project
sentry-cli projects create --organization namastemart --name namastemart-prod

# Upload source maps
sentry-cli releases files upload-sourcemaps ./dist \
  --org namastemart \
  --project namastemart-prod \
  --release 1.0.0
```

### DataDog Integration

```typescript
// src/utils/monitoring.ts
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'your-app-id',
  clientToken: 'your-client-token',
  site: 'datadoghq.com',
  service: 'namastemart-web',
  env: process.env.REACT_APP_ENV,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
});

datadogRum.startSessionReplayRecording();
```

---

## Rollback Procedures

### Web App Rollback

```bash
# Vercel - automatic rollback to previous deployment
vercel rollback

# Manual rollback to specific version
git checkout v1.0.0
npm run build:web
vercel --prod

# Firebase - rollback previous version
firebase hosting:channel:deploy production

# AWS Amplify
amplify hosting delete --app-id xxx
amplify publish  # redeploy from git
```

### Database Rollback

```bash
# 1. Stop the application
sudo systemctl stop namastemart-backend

# 2. Restore from backup
gunzip -c backup_20260814_120000.sql.gz | \
  psql -h your-rds-endpoint.amazonaws.com -U postgres -d namastemart

# 3. Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM shipments;

# 4. Restart application
sudo systemctl start namastemart-backend

# 5. Monitor logs
tail -f /var/log/namastemart-backend.log
```

### Backend Rollback

```bash
# Docker rollback
docker stop namastemart-backend
docker run -d \
  --name namastemart-backend \
  -p 3000:3000 \
  --env-file .env.production \
  namastemart-backend:1.0.0-previous

# Kubernetes rollback
kubectl rollout undo deployment/namastemart-backend
kubectl rollout status deployment/namastemart-backend
```

---

## Deployment Checklists

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Code review approved
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Secrets configured in cloud provider
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Error tracking initialized
- [ ] Load testing completed
- [ ] Security scan passed

### Deployment Steps

- [ ] Create deployment ticket/PR
- [ ] Build docker images
- [ ] Push images to registry
- [ ] Run smoke tests
- [ ] Deploy to staging
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Verify all services running
- [ ] Check error rates
- [ ] Monitor performance

### Post-Deployment

- [ ] Verify user-facing features work
- [ ] Check API response times
- [ ] Monitor error rates (< 1%)
- [ ] Review logs for warnings
- [ ] Verify payment processing works
- [ ] Test tracking updates
- [ ] Confirm emails sending
- [ ] Check mobile app push notifications
- [ ] Monitor database performance
- [ ] Document release notes

### Rollback Criteria

- [ ] Error rate > 5%
- [ ] API response time > 2 seconds
- [ ] Payment processing failing
- [ ] Database connection issues
- [ ] Critical security vulnerability found
- [ ] Data corruption detected

---

## Automation Scripts

### CI/CD Pipeline Trigger

```bash
#!/bin/bash
# deploy.sh

ENV=${1:-staging}
VERSION=$2

if [ -z "$VERSION" ]; then
  VERSION=$(git rev-parse --short HEAD)
fi

echo "Deploying $ENV with version $VERSION"

# Build
npm run build

# Deploy
if [ "$ENV" = "production" ]; then
  vercel --prod --env-file .env.production
else
  vercel --env-file .env.staging
fi

# Run smoke tests
npm run test:smoke

# Notify team
echo "Deployment complete: $VERSION to $ENV"
```

---

**Key Deployment Principles:**
- Blue-Green deployments for zero downtime
- Automated rollback on failure
- Database migration safety checks
- Comprehensive monitoring and alerting
- Regular backup and recovery testing

---

*Last Updated: August 2026*
*Version: 1.0*
