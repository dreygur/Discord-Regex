# CI/CD Pipeline Summary

## What Changed

### ✅ 1. Added Test Execution to Build Process

**Created buildspec files:**
- `buildspec-discord.yml` - Discord bot build with tests
- `buildspec-dashboard.yml` - Dashboard build with tests

**Tests run before every deployment:**
- All unit tests
- All 42 property-based tests (100+ iterations each)
- Database client tests
- Build only proceeds if ALL tests pass

### ✅ 2. Updated Health Checks

**Discord Bot:**
- Old: Simple process check (`pgrep -f "node"`)
- New: HTTP health endpoint check (`http://localhost:8080/health`)
- Checks: Discord connection + DynamoDB connection

**Dashboard:**
- Old: Root path check (`/`)
- New: Dedicated health endpoint (`/api/health`)
- Checks: DynamoDB connection
- ALB health check also updated

### ✅ 3. Updated Infrastructure

**CDK Stack Changes:**
- Updated to CodeBuild Standard 7.0 (Node.js 22 support)
- Switched from inline buildspec to file-based buildspec
- Added proper health check commands
- Added port mappings for health endpoints
- Updated ALB target group health checks

**Dockerfile Changes:**
- Added `wget` for health check commands
- Both Discord and Dashboard containers now support HTTP health checks

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Developer pushes to main branch                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CodePipeline Source Stage                                    │
│    - Webhook triggers pipeline                                  │
│    - Pulls latest code from GitHub                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CodeBuild Build Stage                                        │
│    ├─ Install pnpm and dependencies                             │
│    ├─ Run ALL tests (unit + property-based)                     │
│    │  └─ If tests FAIL → Pipeline STOPS ❌                      │
│    ├─ Build Docker image                                        │
│    └─ Push to ECR                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ECS Deploy Stage                                             │
│    ├─ Update task definition                                    │
│    ├─ Start new tasks                                           │
│    ├─ Wait for health checks to pass                            │
│    │  └─ Health endpoint returns 200 ✓                          │
│    └─ Drain old tasks                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Deployment Complete ✅                                        │
│    - New version running in production                          │
│    - Health checks passing                                      │
│    - CloudWatch logs streaming                                  │
└─────────────────────────────────────────────────────────────────┘
```

## What Happens When You Merge

1. **Merge your feature branch to main**
   ```bash
   git checkout main
   git merge feature-filter_discord_userids
   git push origin main
   ```

2. **Pipeline automatically triggers** (webhook from GitHub)

3. **Tests run in CodeBuild:**
   - Discord bot tests (~2-3 minutes)
   - Dashboard tests (~2-3 minutes)
   - Database tests (included in both)
   - **Total: ~5-10 minutes**

4. **If tests pass:**
   - Docker images built
   - Pushed to ECR
   - Deployed to ECS
   - **Total deployment: ~10-15 minutes**

5. **If tests fail:**
   - Pipeline stops at Build stage
   - No deployment occurs
   - Check CodeBuild logs for failures
   - Fix and push again

## Monitoring Your Deployment

### AWS Console

**CodePipeline:**
- Go to: AWS Console → CodePipeline
- Pipelines: `DiscordBotPipeline` and `DashboardPipeline`
- Watch stages progress: Source → Build → Deploy

**CodeBuild:**
- Go to: AWS Console → CodeBuild
- View build logs to see test output
- Check for test failures or build errors

**ECS:**
- Go to: AWS Console → ECS → Clusters → DiscordBotAndDashboardCluster
- Services: `BotService` and `DashboardService`
- Check task status and health

**CloudWatch Logs:**
- Go to: AWS Console → CloudWatch → Log groups
- `/aws/ecs/DiscordBot` - Discord bot logs
- `/aws/ecs/Dashboard` - Dashboard logs

### CLI Commands

**Check pipeline status:**
```bash
aws codepipeline get-pipeline-state --name DiscordBotPipeline
aws codepipeline get-pipeline-state --name DashboardPipeline
```

**Check build logs:**
```bash
# Get latest build ID
aws codebuild list-builds-for-project --project-name <project-name> --max-items 1

# View build logs
aws codebuild batch-get-builds --ids <build-id>
```

**Check ECS service:**
```bash
aws ecs describe-services \
  --cluster DiscordBotAndDashboardCluster \
  --services BotService DashboardService
```

**Tail logs:**
```bash
aws logs tail /aws/ecs/DiscordBot --follow
aws logs tail /aws/ecs/Dashboard --follow
```

## Test Coverage

Your deployment now includes:

### Property-Based Tests (42 total)
- ✅ Data persistence (5 properties)
- ✅ Validation (4 properties)
- ✅ Regex parsing (2 properties)
- ✅ Message processing (4 properties)
- ✅ Queue and retry (5 properties)
- ✅ Cache functionality (2 properties)
- ✅ Authentication (4 properties)
- ✅ Dashboard CRUD (2 properties)
- ✅ Slash commands (4 properties)
- ✅ Error handling (3 properties)
- ✅ Logging (3 properties)
- ✅ Security (2 properties)
- ✅ Health checks (2 properties)

### Unit Tests
- ✅ Regex engine
- ✅ Cache layer
- ✅ Authentication
- ✅ Database client
- ✅ Webhook queue
- ✅ Message handler
- ✅ Slash commands
- ✅ API routes

## Deployment Safety

### Automatic Rollback

ECS will automatically rollback if:
- New tasks fail health checks
- Tasks crash repeatedly
- Deployment circuit breaker triggers

### Manual Rollback

If needed, rollback to previous version:
```bash
aws ecs update-service \
  --cluster DiscordBotAndDashboardCluster \
  --service BotService \
  --task-definition <previous-task-def> \
  --force-new-deployment
```

### Zero-Downtime Deployment

- Rolling deployment strategy
- New tasks start before old tasks stop
- Health checks ensure new tasks are healthy
- Old tasks drain connections gracefully

## Next Steps

1. **Deploy CDK changes** (if not already done):
   ```bash
   cd infra
   cdk deploy --all
   ```

2. **Merge to main** and watch the pipeline:
   ```bash
   git checkout main
   git merge feature-filter_discord_userids
   git push origin main
   ```

3. **Monitor deployment** in AWS Console

4. **Verify health checks** are passing

5. **Check CloudWatch logs** for any errors

## Troubleshooting

### Tests Fail in Pipeline

1. Check CodeBuild logs for specific test failures
2. Run tests locally: `pnpm test`
3. Fix failing tests
4. Push fix to trigger new build

### Deployment Fails

1. Check ECS service events
2. Check CloudWatch logs for errors
3. Verify health endpoints are responding
4. Check security groups and network configuration

### Health Checks Fail

1. Verify health server is starting (check logs)
2. Test health endpoint from within container
3. Check DynamoDB and Discord connectivity
4. Verify environment variables are set correctly

## Questions?

Refer to `DEPLOYMENT.md` for comprehensive deployment documentation.
