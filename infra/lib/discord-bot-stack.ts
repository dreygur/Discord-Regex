import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

// Define interface for props including DynamoDB tables
export interface DiscordBotStackProps extends cdk.StackProps {
  webhooksTable: dynamodb.Table;
  regexTable: dynamodb.Table;
  serversTable: dynamodb.Table;
  cluster: ecs.Cluster;
  vpc: ec2.Vpc;
}

export class DiscordBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DiscordBotStackProps) {
    super(scope, id, props);

    // 1. Reference DynamoDB Tables from props
    const { webhooksTable, regexTable, serversTable, cluster, vpc } = props;

    // 2. Create ECR Repository for Docker images
    const ecrRepo = new ecr.Repository(this, 'BotEcrRepo', {
      repositoryName: 'discord-bot',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3. Create ECS Cluster
    // const vpc = new ec2.Vpc(this, 'BotVpc', { maxAzs: 2 });
    // const cluster = new ecs.Cluster(this, 'BotCluster', { vpc });

    // 4. Create Task Definition with placeholder image
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BotTaskDef');

    // 6. Grant permissions to access DynamoDB tables
    webhooksTable.grantReadWriteData(taskDefinition.taskRole);
    regexTable.grantReadWriteData(taskDefinition.taskRole);
    serversTable.grantReadWriteData(taskDefinition.taskRole);

    // Add container definition - this is essential
    const container = taskDefinition.addContainer('BotContainer', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo),
      healthCheck: {
        command: [
          'CMD-SHELL',
          'pgrep -f "node" || exit 1'
        ],
        interval: cdk.Duration.seconds(30),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(5)
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'DiscordBot',
        logRetention: logs.RetentionDays.ONE_WEEK
      }),
      essential: true,
    });

    // 5. Create Fargate Service
    const service = new ecs.FargateService(this, 'BotService', {
      cluster,
      taskDefinition,
    });

    // 7. Create CodeStar Connection for GitHub
    const sourceOutput = new codepipeline.Artifact('SourceArtifact');
    const githubConnection = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'Lifestyle-Trading',
      repo: 'hft-discord-trading',
      branch: 'main',
      oauthToken: cdk.SecretValue.secretsManager('github-token'),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
    });

    // Build Stage
    const buildOutput = new codepipeline.Artifact('DiscordBotCodeBuild');
    const buildProject = new codebuild.PipelineProject(this, 'BotBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
        privileged: true, // Required for Docker
        environmentVariables: {
          ECR_REPO_URI: { value: ecrRepo.repositoryUri },
          AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo "Logging in to ECR..."',
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI',
            ],
          },
          build: {
            commands: [
              'APP_ENV_CONTENT=$(aws ssm get-parameter --name "bot" --with-decryption --query "Parameter.Value" --output text)',
              'echo "APP_ENV_CONTENT: $APP_ENV_CONTENT"',

              "BUILD_ARGS=$(echo \"$APP_ENV_CONTENT\" | sed -e 's/^/--build-arg /')",
              'echo "env: $BUILD_ARGS"',

              'docker build -t $ECR_REPO_URI:latest -f apps/discord/Dockerfile . $BUILD_ARGS',
              'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION',
            ],
          },
          post_build: {
            commands: [
              'docker push $ECR_REPO_URI:latest',
              'docker push $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION',
              'printf "[{\\"name\\":\\"BotContainer\\",\\"imageUri\\":\\"%s\\"}]" $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'],
        },
      }),
    });

    // Grant build project permissions
    ecrRepo.grantPullPush(buildProject);

    // Grant read access to SSM parameters
    ssm.StringParameter.fromStringParameterName(
      this,
      'bot',
      'bot'
    ).grantRead(buildProject);

    // 8. Create Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'BotPipeline', {
      pipelineName: 'DiscordBotPipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [githubConnection],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'DockerBuild',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.EcsDeployAction({
              actionName: 'FargateDeploy',
              service,
              input: buildOutput,
              deploymentTimeout: cdk.Duration.minutes(15),
            }),
          ],
        }
      ]
    });
  }
}