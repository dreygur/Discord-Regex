# Doscord Bot parsing RegExp

This discord bot parses RegExp patterns and sends the messages to their corresponding webhooks

## Docker

This project comes with a `compose.yml` and app specific `Dockerfile` which contains the production configuration for [Turborepo](https://turbo.build/) with [PNPM Workspace](https://pnpm.io/workspaces)

The docker compose contains three services:

- DynamoDB Local
- Dashboard
- Discord Bot

Each of these run in seperate container with a bridged network.

## Deployment

The project utilizes AWS CDK for infrastructure as code and deployment automation. The deployment process includes:

### AWS Infrastructure

- **DynamoDB Tables**: Three tables are used to store webhooks, regex patterns, and server information
- **ECS Fargate**: Containerized services run on AWS Fargate for scalable, serverless container management
- **VPC Configuration**: Services run in a VPC with public and private subnets for security
- **CI/CD Pipeline**: Automated deployment pipeline using AWS CodePipeline and CodeBuild

### Deployment Steps

1. Install AWS CDK if not already installed:

   ```
   npm install -g aws-cdk
   ```

2. Configure AWS credentials:

   ```
   aws configure
   ```

3. Bootstrap the CDK environment (first-time only):

   ```
   cdk bootstrap
   ```

4. Deploy the infrastructure:
   ```
   cdk deploy --all
   ```

## Project Structure

```
discord-regex/
├── apps/
│   ├── dashboard/       # Next.js dashboard for managing servers and webhooks
│   └── discord/         # Discord bot service
├── packages/
│   └── database/        # Shared database access layer for DynamoDB
├── infra/               # AWS CDK infrastructure code
└── compose.yml          # Docker Compose configuration for local development
```

## Local Development

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/discord-regex.git
   cd discord-regex
   ```

2. Install dependencies:

   ```
   pnpm install
   ```

3. Start the local development environment:

   ```
   docker-compose up
   ```

4. Access the dashboard at http://localhost:3000

## Features

- **Regex Pattern Matching**: Configure custom regex patterns to match against Discord messages
- **Webhook Integration**: Forward matched messages to configured webhooks
- **Server Management**: Manage multiple Discord servers from a single dashboard
- **User-friendly Dashboard**: Easy-to-use interface for managing regex patterns and webhooks

---

_Made with ❤️ by [Rakibul Yeasin](https://github.com/dreygur) from Bangladesh_
