import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class DashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create DynamoDB Table
    // const table = new dynamodb.Table(this, 'DashboardTable', {
    //   partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    // });

    // 2. Create ECR Repository for Docker images
    const ecrRepo = new ecr.Repository(this, 'DashboardEcrRepo', {
      repositoryName: 'dashboard',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3. Create ECS Cluster
    const vpc = new ec2.Vpc(this, 'DashboardVpc', { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, 'DashboardCluster', { vpc });

    // 4. Create Task Definition with placeholder image
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'DashboardTaskDef');

    // 5. Create Fargate Service
    const service = new ecs.FargateService(this, 'DashboardService', {
      cluster,
      taskDefinition,
    });

    // 6. Grant permissions
    // table.grantReadWriteData(taskDefinition.taskRole);

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
    const buildOutput = new codepipeline.Artifact('DashboardCodeBuild');
    const buildProject = new codebuild.PipelineProject(this, 'DashboardProject', {
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
              'docker build -t $ECR_REPO_URI:latest -f apps/dashboard/Dockerfile .',
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
    // buildProject.addToRolePolicy(new iam.PolicyStatement({
    //   actions: ['secretsmanager:GetSecretValue'],
    //   resources: [
    //     `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:dashboard-secret*`,
    //   ],
    // }));

    const buildStage = new codepipeline_actions.CodeBuildAction({
      actionName: 'DockerBuild',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployStage = new codepipeline_actions.EcsDeployAction({
      actionName: 'FargateDeploy',
      service,
      input: buildOutput,
      deploymentTimeout: cdk.Duration.minutes(5),
    });

    // 8. Create Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'DashboardPipeline', {
      pipelineName: 'DashboardPipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [githubConnection],
        },
        {
          stageName: 'Build',
          actions: [
            buildStage
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            deployStage
          ],
        }
      ],
    });
  }
}