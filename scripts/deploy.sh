#!/bin/bash
set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="YOUR_AWS_ACCOUNT"
GITHUB_TOKEN="YOUR_GH_TOKEN"
DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
APP_NAME="discord-bot"

# Create ECR repositories
aws ecr create-repository \
  --repository-name ${APP_NAME}-bot \
  --region ${AWS_REGION} || true

aws ecr create-repository \
  --repository-name ${APP_NAME}-dashboard \
  --region ${AWS_REGION} || true

# Create Secrets
aws secretsmanager create-secret \
  --name discord-secrets \
  --secret-string "{\"BOT_TOKEN\":\"${DISCORD_BOT_TOKEN}\",\"DATABASE_URL\":\"DYNAMODB_URI\"}" \
  --region ${AWS_REGION} || true

aws secretsmanager create-secret \
  --name dashboard-secrets \
  --secret-string "{\"SECRET_KEY\":\"$(openssl rand -hex 32)\",\"DATABASE_URL\":\"DYNAMODB_URI\"}" \
  --region ${AWS_REGION} || true

# Create GitHub connection secret
aws secretsmanager create-secret \
  --name github-token \
  --secret-string "${GITHUB_TOKEN}" \
  --region ${AWS_REGION} || true

# Bootstrap CDK
npx cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION} \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess

# Deploy the stack
npx cdk deploy --require-approval never --outputs-file outputs.json

echo "Deployment complete! Outputs:"
cat outputs.json