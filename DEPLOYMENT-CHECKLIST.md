# Deployment Checklist

## Pre-Deployment

- [ ] All tests passing locally
  ```bash
  cd hft-discord-trading
  pnpm test
  ```

- [ ] Code committed and pushed to feature branch
  ```bash
  git add -A
  git commit -m "Your commit message"
  git push origin feature-filter_discord_userids
  ```

## Infrastructure Updates

- [ ] Review CDK changes
  ```bash
  cd infra
  cdk diff
  ```

- [ ] Deploy CDK stacks (if changes needed)
  ```bash
  cdk deploy --all
  ```

- [ ] Verify SSM parameters exist
  ```bash
  aws ssm get-parameter --name "bot" --with-decryption
  aws ssm get-parameter --name "dashboard" --with-decryption
  ```

## Merge to Main

- [ ] Switch to main branch
  ```bash
  git checkout main
  git pull origin main
  ```

- [ ] Merge feature branch
  ```bash
  git merge feature-filter_discord_userids
  ```

- [ ] Push to trigger pipeline
  ```bash
  git push origin main
  ```

## Monitor Deployment

- [ ] Watch CodePipeline in AWS Console
  - DiscordBotPipeline
  - DashboardPipeline

- [ ] Check CodeBuild logs for test results
  - All tests should pass
  - Docker build should succeed

- [ ] Monitor ECS deployment
  - New tasks starting
  - Health checks passing
  - Old tasks draining

## Post-Deployment Verification

- [ ] Check ECS services are running
  ```bash
  aws ecs describe-services \
    --cluster DiscordBotAndDashboardCluster \
    --services BotService DashboardService
  ```

- [ ] Verify health endpoints (from within VPC or via ALB)
  ```bash
  # Discord Bot (port forward or from VPC)
  curl http://localhost:8080/health
  
  # Dashboard (via ALB)
  curl http://<alb-dns-name>/api/health
  ```

- [ ] Check CloudWatch Logs for errors
  ```bash
  aws logs tail /aws/ecs/DiscordBot --follow
  aws logs tail /aws/ecs/Dashboard --follow
  ```

- [ ] Test Discord bot functionality
  - Send test message in Discord
  - Verify pattern matching works
  - Check webhook delivery

- [ ] Test Dashboard functionality
  - Login to dashboard
  - Create/update/delete entities
  - Verify data persistence

## Rollback (if needed)

- [ ] Identify previous task definition ARN
  ```bash
  aws ecs list-task-definitions --family-prefix BotTaskDef
  ```

- [ ] Rollback service
  ```bash
  aws ecs update-service \
    --cluster DiscordBotAndDashboardCluster \
    --service BotService \
    --task-definition <previous-arn> \
    --force-new-deployment
  ```

## Cleanup (optional)

- [ ] Delete feature branch locally
  ```bash
  git branch -d feature-filter_discord_userids
  ```

- [ ] Delete feature branch remotely
  ```bash
  git push origin --delete feature-filter_discord_userids
  ```

## Notes

- Pipeline takes ~10-15 minutes total
- Tests run automatically before deployment
- Health checks must pass for deployment to succeed
- Zero-downtime rolling deployment
- Automatic rollback on health check failures

## Support

- See `DEPLOYMENT.md` for detailed documentation
- See `CI-CD-SUMMARY.md` for pipeline overview
- Check CloudWatch Logs for application logs
- Check CodeBuild logs for build/test failures
