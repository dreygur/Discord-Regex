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
  env: cdk.Environment;
}

export class DiscordBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DiscordBotStackProps) {
    super(scope, id, props);

    // Reference DynamoDB Tables from props
    const { webhooksTable, regexTable, serversTable, cluster } = props;

    // Create ECR Repository for Docker images
    const ecrRepo = new ecr.Repository(this, 'BotEcrRepo', {
      repositoryName: 'discord-bot',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Task Definition with placeholder image
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BotTaskDef');

    // Grant permissions to access DynamoDB tables
    webhooksTable.grantFullAccess(taskDefinition.taskRole);
    regexTable.grantFullAccess(taskDefinition.taskRole);
    serversTable.grantFullAccess(taskDefinition.taskRole);

    // Add container definition with health check endpoint
    const container = taskDefinition.addContainer('BotContainer', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo),
      healthCheck: {
        command: [
          'CMD-SHELL',
          'wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1'
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

    // Add port mapping for health check endpoint
    container.addPortMappings({
      containerPort: 8080,
      protocol: ecs.Protocol.TCP,
    });

    // Create Fargate Service
    const service = new ecs.FargateService(this, 'BotService', {
      cluster,
      taskDefinition,
    });

    // Create CodeStar Connection for GitHub
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
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true, // Required for Docker
        environmentVariables: {
          ECR_REPO_URI: { value: ecrRepo.repositoryUri },
          AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec-discord.yml'),
    });

    // Grant build project permissions
    ecrRepo.grantPullPush(buildProject);

    // Grant read access to SSM parameters
    ssm.StringParameter.fromStringParameterName(
      this,
      'bot',
      'bot'
    ).grantRead(buildProject);

    // Create Pipeline
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
      ]
    });

    // Add Deploy Stage
    // Comment out this section when first time deploying the pipeline
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.EcsDeployAction({
          actionName: 'FargateDeploy',
          service,
          input: buildOutput,
          deploymentTimeout: cdk.Duration.minutes(15),
        }),
      ],
    });
  }
}