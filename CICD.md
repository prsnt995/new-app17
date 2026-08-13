# NamasteMart - CI/CD Pipeline Configuration

**Version:** 1.0  
**Last Updated:** August 2026  
**Platform:** GitHub Actions

---

## Table of Contents

1. [GitHub Actions Workflows](#github-actions-workflows)
2. [Test Pipeline](#test-pipeline)
3. [Build Pipeline](#build-pipeline)
4. [Deploy Pipeline](#deploy-pipeline)
5. [Monitoring & Alerts](#monitoring--alerts)

---

## GitHub Actions Workflows

### Directory Structure
```
.github/
├── workflows/
│   ├── test.yml              # Run tests on PR
│   ├── build.yml             # Build on merge to main
│   ├── deploy-staging.yml    # Deploy to staging
│   ├── deploy-production.yml # Deploy to production
│   ├── security-scan.yml     # Security checks
│   ├── lighthouse.yml        # Performance testing
│   └── schedule.yml          # Scheduled tasks
└── actions/
    ├── notify-slack/action.yml
    └── run-tests/action.yml
```

---

## Test Pipeline

### .github/workflows/test.yml

```yaml
name: Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check TypeScript
        run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage --watchAll=false
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false
          verbose: true
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: namastemart_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/namastemart_test
        run: npm run db:migrate:test
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/namastemart_test
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build app
        run: npm run build:web
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload E2E artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-screenshots
          path: e2e/screenshots/

  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'NamasteMart'
          path: '.'
          format: 'JSON'
          args: >-
            --enableExperimental
      
      - name: Upload OWASP results
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: reports/dependency-check-report.json

  notify:
    if: always()
    needs: [lint, unit-tests, integration-tests, e2e-tests, security-check]
    runs-on: ubuntu-latest
    steps:
      - name: Determine test status
        run: |
          if [ "${{ needs.lint.result }}" = "failure" ] || \
             [ "${{ needs.unit-tests.result }}" = "failure" ] || \
             [ "${{ needs.integration-tests.result }}" = "failure" ] || \
             [ "${{ needs.e2e-tests.result }}" = "failure" ]; then
            echo "TEST_STATUS=❌ FAILED" >> $GITHUB_ENV
            exit 1
          else
            echo "TEST_STATUS=✅ PASSED" >> $GITHUB_ENV
          fi
      
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Test Results: ${{ env.TEST_STATUS }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Workflow:* ${{ github.workflow }}\n*Branch:* ${{ github.ref }}\n*Status:* ${{ env.TEST_STATUS }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Build Pipeline

### .github/workflows/build.yml

```yaml
name: Build

on:
  push:
    branches: [main]
    paths-ignore:
      - '*.md'
      - '.github/workflows/test.yml'

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web
        env:
          REACT_APP_VERSION: ${{ github.sha }}
        run: npm run build:web
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: ./dist/
          retention-days: 5

  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Expo
        run: npm install -g eas-cli
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Android
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          EAS_BUILD_PROFILE: production
        run: eas build --platform android --wait
      
      - name: Build iOS
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          EAS_BUILD_PROFILE: production
        run: eas build --platform ios --wait

  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build backend
        run: npm run build
      
      - name: Upload build
        uses: actions/upload-artifact@v3
        with:
          name: backend-build
          path: ./dist/
          retention-days: 5

  docker-build:
    runs-on: ubuntu-latest
    needs: [build-web, build-backend]
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v1
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1
      
      - name: Get git version
        id: version
        run: echo "tag=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      
      - name: Build and push backend image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.backend
          push: true
          tags: |
            ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/namastemart-backend:${{ steps.version.outputs.tag }}
            ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/namastemart-backend:latest
          cache-from: type=registry,ref=${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/namastemart-backend:buildcache
          cache-to: type=registry,ref=${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/namastemart-backend:buildcache,mode=max
      
      - name: Build and push web image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.web
          push: true
          tags: |
            ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/namastemart-web:${{ steps.version.outputs.tag }}
            ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/namastemart-web:latest
```

---

## Deploy Pipeline

### .github/workflows/deploy-staging.yml

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:web
        env:
          REACT_APP_ENV: staging
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        run: vercel deploy --token=$VERCEL_TOKEN --env-file .env.staging
      
      - name: Run smoke tests
        run: npm run test:smoke
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Staging Deployment: ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Environment:* Staging\n*Status:* ${{ job.status }}\n*Commit:* ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### .github/workflows/deploy-production.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths-ignore:
      - '*.md'
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run all tests
        run: npm test -- --coverage

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          VERSION=$(npm pkg get version | tr -d '"')
          gh release create v$VERSION \
            --title "Release $VERSION" \
            --generate-notes \
            --draft=false
      
      - name: Build
        run: npm run build
        env:
          REACT_APP_ENV: production
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        run: vercel deploy --prod --token=$VERCEL_TOKEN --env-file .env.production
      
      - name: Deploy backend to ECS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1
        run: |
          aws ecs update-service \
            --cluster namastemart-prod \
            --service namastemart-backend \
            --force-new-deployment
      
      - name: Submit mobile builds
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: eas submit --platform all --auto
      
      - name: Run smoke tests
        run: npm run test:smoke:prod
      
      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Production Deployment Complete",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Status:* ✅ Success\n*Version:* ${{ github.ref_name }}\n*Deployed by:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Security Scan

### .github/workflows/security-scan.yml

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
      
      - name: Generate SBOM
        run: npm list --depth=0 > sbom.txt

  codeql:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: 'javascript'
      
      - name: Analyze
        uses: github/codeql-action/analyze@v2

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t namastemart-backend:test -f Dockerfile.backend .
      
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: namastemart-backend:test
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## Monitoring & Alerts

### .github/workflows/health-check.yml

```yaml
name: Health Check

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - name: Check API health
        run: |
          for i in {1..3}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              https://api.namastemart.com/health)
            if [ $STATUS -eq 200 ]; then
              echo "✅ API is healthy"
              exit 0
            fi
            sleep 5
          done
          echo "❌ API is down"
          exit 1
      
      - name: Check database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
        run: |
          psql $DATABASE_URL -c "SELECT 1"
      
      - name: Alert if failed
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "🚨 Health Check Failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Critical services are down. Please investigate immediately."
                  }
                }
              ]
            }
```

---

## Secrets Management

### GitHub Secrets to Configure

```yaml
# AWS Credentials
AWS_ACCESS_KEY_ID: xxx
AWS_SECRET_ACCESS_KEY: xxx
AWS_ACCOUNT_ID: xxx

# Database
DATABASE_URL_PROD: postgresql://...
DATABASE_URL_STAGING: postgresql://...

# API Keys
STRIPE_SECRET_KEY: sk_xxx
RAZORPAY_KEY_ID: xxx
RAZORPAY_KEY_SECRET: xxx

# Services
EXPO_TOKEN: xxx
SLACK_WEBHOOK_URL: xxx
SENTRY_DSN: xxx

# Deployment
VERCEL_TOKEN: xxx
VERCEL_ORG_ID: xxx
VERCEL_PROJECT_ID: xxx
VERCEL_PROJECT_ID_PROD: xxx
```

---

**CI/CD Best Practices:**
- Run tests on every PR
- Block merges if tests fail
- Auto-deploy to staging
- Manual approval for production
- Comprehensive logging and monitoring
- Automated rollback on failure

---

*Last Updated: August 2026*
*Version: 1.0*
