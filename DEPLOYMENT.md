# Deployment Guide

## Overview

This guide covers deploying the Discord Regex Bot system to AWS ECS using CodePipeline, CodeBuild, and CodeDeploy.

## Architecture

- **Discord Bot**: Fargate service monitoring Discord messages
- **Dashboard**: Fargate service with ALB for web interface
- **Database**: DynamoDB tables for data persistence
- **CI/CD**: CodePipeline → CodeBuild (with tests) → ECS Deploy

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 22+ and pnpm installed
3. GitHub repository with webhook access
4. AWS Secrets Manager secret named `github-token` with your GitHub personal access token

## Pipeline Configuration

### Current Setup

Both pipelines are configured to:
- **Watch branch**: `main`
- **Trigger**: Webhook (automatic on push to main)
- **Build image**: AWS CodeBuild Standard 7.0
- **Test**: Runs all unit and property-based tests before building Docker images
- **Deploy**: Automatic deployment to ECS Fargate

### Pipeline Flow

```
Push to main → CodePipeline triggered → CodeBuild runs tests → 
Tests pass → Build Docker image → Push to ECR → Deploy to ECS
```

## Health Checks

### Discord Bot Health Check
- **Endpoint**: `http://localhost:8080/health`
- **Port**: 8080
- **Checks**: 
  - Discord connection status
  - DynamoDB connection status
- **Returns**: 
  - 200 when healthy
  - 503 when unhealthy

### Dashboard Health Check
- **Endpoint**: `http://localhost:3000/api/health`
- **Port**: 3000 (also used for web traffic)
- **Checks**:
  - DynamoDB connection status
- **Returns**:
  - 200 when healthy
  - 503 when unhealthy

### ECS Health Check Configuration

**Discord Bot Container:**
```bash
wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

**Dashboard Container:**
```bash
wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

**ALB Health Check (Dashboard only):**
- Path: `/api/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

## Environment Variables

### Required SSM Parameters

Store environment variables in AWS Systems Manager Parameter Store:

**Discord Bot** (`/bot`):
```
TOKEN=<discord-bot-token>
THUMBNAIL=<optional-thumbnail-url>
REGION=<aws-region>
ENDPOINT=<dynamodb-endpoint>
ACCESS_KEY_ID=<aws-access-key>
SECRET_ACCESS_KEY=<aws-secret-key>
CACHE_TTL=60000
DEFAULT_RETRIES=3
DEFAULT_DELAY=1000
```

**Dashboard** (`/dashboard`):
```
NEXT_PUBLIC_BASE_URL=<dashboard-url>
NEXT_REGION=<aws-region>
NEXT_ENDPOINT=<dynamodb-endpoint>
NEXT_ACCESS_KEY_ID=<aws-access-key>
NEXT_SECRET_ACCESS_KEY=<aws-secret-key>
NEXT_HASHED_PASSWORD=<sha256-hashed-password>
NEXT_VALID_EMAIL=<admin-email>
```

### Creating SSM Parameters

```bash
# Discord Bot
aws ssm put-parameter \
  --name "bot" \
  --value "TOKEN=your-token\nREGION=us-east-1\n..." \
  --type "SecureString" \
  --overwrite

# Dashboard
aws ssm put-parameter \
  --name "dashboard" \
  --value "NEXT_PUBLIC_BASE_URL=https://your-domain.com\n..." \
  --type "SecureString" \
  --overwrite
```

## Testing in CI/CD

### Test Execution

The buildspec files run comprehensive tests before building:

```bash
# Discord Bot tests
pnpm test --filter=@discord/bot --filter=@database/client --run

# Dashboard tests
pnpm test --filter=@discord/dashboard --filter=@database/client --run
```

### Test Coverage

- **42 property-based tests** using fast-check (100+ iterations each)
- **Unit tests** for all core components
- **Integration tests** for API routes
- Tests must pass before Docker image is built

### Build Failure Handling

If tests fail:
1. CodeBuild stage fails
2. Pipeline stops (no deployment)
3. Check CodeBuild logs for test failures
4. Fix issues and push again

## Deployment Process

### 1. Merge to Main Branch

```bash
cd hft-discord-trading
git checkout main
git pull origin main
git merge feature-filter_discord_userids
git push origin main
```

### 2. Monitor Pipeline

Go to AWS Console → CodePipeline:
- **DiscordBotPipeline**: Monitors Discord bot deployment
- **DashboardPipeline**: Monitors Dashboard deployment

### 3. Pipeline Stages

**Source Stage:**
- Pulls latest code from GitHub main branch
- Duration: ~10 seconds

**Build Stage:**
- Installs dependencies
- Runs all tests
- Builds Docker image
- Pushes to ECR
- Duration: ~5-10 minutes

**Deploy Stage:**
- Updates ECS task definition
- Triggers rolling deployment
- Waits for health checks
- Duration: ~3-5 minutes

### 4. Verify Deployment

**Check ECS Services:**
```bash
# Discord Bot
aws ecs describe-services \
  --cluster DiscordBotAndDashboardCluster \
  --services BotService

# Dashboard
aws ecs describe-services \
  --cluster DiscordBotAndDashboardCluster \
  --services DashboardService
```

**Check Health Endpoints:**
```bash
# Discord Bot (from within VPC or via port forwarding)
curl http://localhost:8080/health

# Dashboard (via ALB)
curl http://<alb-dns-name>/api/health
```

**Check CloudWatch Logs:**
```bash
# Discord Bot logs
aws logs tail /aws/ecs/DiscordBot --follow

# Dashboard logs
aws logs tail /aws/ecs/Dashboard --follow
```

## Troubleshooting

### Pipeline Fails at Build Stage

**Check CodeBuild logs:**
```bash
aws codebuild batch-get-builds --ids <build-id>
```

**Common issues:**
- Test failures: Check test output in logs
- Docker build failures: Check Dockerfile syntax
- ECR push failures: Check IAM permissions

### Deployment Fails

**Check ECS events:**
```bash
aws ecs describe-services \
  --cluster DiscordBotAndDashboardCluster \
  --services BotService \
  --query 'services[0].events[0:10]'
```

**Common issues:**
- Health check failures: Container not responding on health endpoint
- Task startup failures: Check CloudWatch logs for errors
- Resource constraints: Check CPU/memory limits

### Health Check Failures

**Container health check failing:**
1. Check if health server is starting: `grep "Health check server" in CloudWatch logs`
2. Verify port 8080 (bot) or 3000 (dashboard) is exposed
3. Check if dependencies (Discord, DynamoDB) are accessible

**ALB health check failing (Dashboard):**
1. Verify security group allows traffic on port 3000
2. Check target group health in EC2 console
3. Test health endpoint directly from within VPC

### Rollback

If deployment causes issues:

```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster DiscordBotAndDashboardCluster \
  --service BotService \
  --task-definition <previous-task-def-arn> \
  --force-new-deployment
```

## Infrastructure Updates

### Deploying CDK Changes

After updating CDK stacks:

```bash
cd infra
npm install
cdk diff  # Review changes
cdk deploy --all  # Deploy all stacks
```

### Updating Build Configuration

After modifying buildspec files:
1. Commit and push changes
2. Pipeline will automatically use new buildspec on next run
3. No CDK deployment needed

## Monitoring

### CloudWatch Dashboards

Create dashboards to monitor:
- ECS service CPU/memory usage
- Task count and health
- ALB request count and latency
- DynamoDB read/write capacity

### Alarms

Set up CloudWatch alarms for:
- ECS service unhealthy tasks
- High error rates in logs
- DynamoDB throttling
- ALB 5xx errors

### Logs

**Structured JSON logs** are sent to CloudWatch:
- Log group: `/aws/ecs/DiscordBot` and `/aws/ecs/Dashboard`
- Retention: 7 days
- Format: JSON with timestamp, level, message, context

**Query logs:**
```bash
# Find errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/DiscordBot \
  --filter-pattern '{ $.level = "ERROR" }'

# Find specific server activity
aws logs filter-log-events \
  --log-group-name /aws/ecs/DiscordBot \
  --filter-pattern '{ $.context.serverId = "123456789" }'
```

## Security Considerations

1. **Secrets Management**: All sensitive data in SSM Parameter Store (encrypted)
2. **Network Security**: Services in private subnets with NAT gateway
3. **IAM Roles**: Least privilege access for ECS tasks
4. **HTTPS**: Dashboard should use HTTPS in production (configure ALB listener)
5. **Input Validation**: All inputs sanitized and validated
6. **ReDoS Prevention**: Regex complexity limits enforced

## Performance Optimization

1. **Caching**: 60-second TTL on database queries
2. **Parallel Processing**: Webhooks processed in parallel
3. **Connection Pooling**: Reuse Discord and DynamoDB connections
4. **Efficient Queries**: DynamoDB queries optimized with proper keys

## Cost Optimization

1. **Fargate Spot**: Consider using Spot instances for non-critical workloads
2. **Auto Scaling**: Configure based on CPU/memory metrics
3. **Log Retention**: Set appropriate retention periods (currently 7 days)
4. **DynamoDB**: Use on-demand billing or provision based on actual usage

## Next Steps

1. Set up custom domain for Dashboard with Route 53
2. Configure HTTPS with ACM certificate
3. Set up CloudWatch dashboards and alarms
4. Configure auto-scaling policies
5. Set up backup strategy for DynamoDB tables
6. Implement blue/green deployments for zero-downtime updates
