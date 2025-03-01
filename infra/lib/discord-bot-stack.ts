import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

class DiscordBotStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Infrastructure setup
    const vpc = new ec2.Vpc(this, 'BotVPC', {
      maxAzs: 2,
      natGateways: 1, // Single NAT gateway for cost optimization
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });
    const cluster = new ecs.Cluster(this, 'BotCluster', { vpc });
    const repository = new ecr.Repository(this, 'BotECR');
    const secret = secretsmanager.Secret.fromSecretNameV2(this, 'BotSecret', 'discord-bot-secrets');

    // ECS Task Definition
    const taskRole = new iam.Role(this, 'BotTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    secret.grantRead(taskRole);

    // Grant DynamoDB permissions to the task role
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:BatchGetItem',
        'dynamodb:BatchWriteItem',
        'dynamodb:DescribeTable',
        'dynamodb:CreateTable'
      ],
      resources: [
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/Webhooks`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/RegexPatterns`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/Servers`
      ],
    }));

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BotTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    taskDefinition.addContainer('BotContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      secrets: {
        DISCORD_TOKEN: ecs.Secret.fromSecretsManager(secret, 'DISCORD_TOKEN'),
      },
      environment: {
        WEBHOOKS_TABLE_NAME: 'Webhooks',
        REGEX_TABLE_NAME: 'RegexPatterns',
        SERVERS_TABLE_NAME: 'Servers'
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'bot' }),
      healthCheck: {
        command: ['CMD-SHELL', 'pgrep node || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Create a security group for the Fargate service
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'BotServiceSecurityGroup', {
      vpc,
      description: 'Security group for discord bot service',
      allowAllOutbound: true,
    });

    const service = new ecs.FargateService(this, 'BotService', {
      cluster,
      taskDefinition,
      desiredCount: 1, // Single instance is enough for a bot
      securityGroups: [serviceSecurityGroup],
      assignPublicIp: false, // Use private IPs for security
    });

    // CI/CD Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'BotPipeline', {
      pipelineName: 'DiscordBotPipeline',
    });

    // GitHub Source configuration
    const sourceOutput = new codepipeline.Artifact('SourceArtifact');

    // Configure GitHub source action to trigger on pushes to main branch
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'your-github-org',
      repo: 'your-repo',
      oauthToken: cdk.SecretValue.secretsManager('github-token'),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
      branch: 'main', // Trigger on pushes to main branch
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // Add a comment explaining the trigger mechanism
    /*
     * Pipeline trigger configuration:
     * - The pipeline is triggered automatically when code is pushed to the main branch
     * - The default GitHub webhook configuration handles this without additional setup
     * - Each push to main will trigger a build and deployment
     */

    // Build Stage
    const buildProject = new codebuild.PipelineProject(this, 'BotBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0, // Updated to newer version
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,
      },
      environmentVariables: {
        ECR_REPO_URI: { value: repository.repositoryUri },
        AWS_ACCOUNT_ID: { value: cdk.Aws.ACCOUNT_ID },
        AWS_REGION: { value: cdk.Aws.REGION },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
            ],
          },
          build: {
            commands: [
              'echo Building Docker image...',
              'docker build -t $ECR_REPO_URI:latest .',
              'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION',
            ],
          },
          post_build: {
            commands: [
              'echo Pushing Docker images...',
              'docker push $ECR_REPO_URI:latest',
              'docker push $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION',
              'echo Writing image definitions...',
              `printf '[{"name":"BotContainer","imageUri":"%s"}]' $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json`,
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'],
        },
      }),
    });

    repository.grantPullPush(buildProject);

    const buildOutput = new codepipeline.Artifact('BuildArtifact');
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Build',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Deploy Stage
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.EcsDeployAction({
          actionName: 'Deploy',
          service,
          input: buildOutput,
        }),
      ],
    });

    // Add auto-scaling based on CPU utilization (optional for a bot, but added for consistency)
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2, // Lower max capacity since it's just a bot
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 80, // Higher threshold for bot
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }
}

export { DiscordBotStack };