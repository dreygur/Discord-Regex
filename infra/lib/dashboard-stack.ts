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
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

// Define interface for props including DynamoDB tables
export interface DashboardStackProps extends cdk.StackProps {
  webhooksTable: dynamodb.Table;
  regexTable: dynamodb.Table;
  serversTable: dynamodb.Table;
  cluster: ecs.Cluster;
  vpc: ec2.Vpc;
  env: cdk.Environment;
}

export class DashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DashboardStackProps) {
    super(scope, id, props);

    // Reference DynamoDB Tables from props
    const { webhooksTable, regexTable, serversTable, cluster } = props;

    // Create ALB
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true, // Make it publicly accessible
    });

    // Create Listener
    const listener = loadBalancer.addListener('Listener', {
      port: 80,
      open: true,
    });

    // Create ECR Repository for Docker images
    const ecrRepo = new ecr.Repository(this, 'DashboardEcrRepo', {
      repositoryName: 'dashboard',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Task Definition with placeholder image
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'DashboardTaskDef');

    // Grant permissions to access DynamoDB tables
    webhooksTable.grantFullAccess(taskDefinition.taskRole);
    regexTable.grantFullAccess(taskDefinition.taskRole);
    serversTable.grantFullAccess(taskDefinition.taskRole);

    // Create Fargate Service
    const service = new ecs.FargateService(this, 'DashboardService', {
      cluster,
      taskDefinition,
    });

    const securityGroup = new ec2.SecurityGroup(this, 'DashboardSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true, // Required for internet access
    });

    // Allow HTTP Traffic
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'Allow traffic to Dashboard');

    // Attach Security Group to Fargate Service
    service.connections.addSecurityGroup(securityGroup);

    // Add container definition with health check endpoint
    const container = taskDefinition.addContainer('DashboardContainer', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo),
      healthCheck: {
        command: [
          'CMD-SHELL',
          'wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1'
        ],
        interval: cdk.Duration.seconds(30),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(5)
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'Dashboard',
        logRetention: logs.RetentionDays.ONE_WEEK
      }),
      essential: true,
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
    const buildOutput = new codepipeline.Artifact('DashboardCodeBuild');
    const buildProject = new codebuild.PipelineProject(this, 'DashboardProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true, // Required for Docker
        environmentVariables: {
          ECR_REPO_URI: { value: ecrRepo.repositoryUri },
          AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec-dashboard.yml'),
    });

    // Grant build project permissions
    ecrRepo.grantPullPush(buildProject);
    container.addPortMappings({
      containerPort: 3000,
      hostPort: 3000,
    });

    // Grant read access to SSM parameters
    ssm.StringParameter.fromStringParameterName(
      this,
      'dashboard',
      'dashboard'
    ).grantRead(buildProject);

    // Attach Target Group to Service with health check endpoint
    listener.addTargets('DashboardTarget', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 3000,
      targets: [service],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: '200',
      },
    });

    // Output Load Balancer URL
    new cdk.CfnOutput(this, 'ALBURL', {
      value: loadBalancer.loadBalancerDnsName,
    });

    // Create Pipeline
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
            new codepipeline_actions.CodeBuildAction({
              actionName: 'DockerBuild',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            })
          ],
        },
      ],
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
          deploymentTimeout: cdk.Duration.minutes(5),
        })
      ],
    });
  }
}