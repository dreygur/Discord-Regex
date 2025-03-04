import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class ClusterStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'DiscordBotAndDashboardVpc', {
      maxAzs: 2,
      vpcName: 'discord-bot-dashboard-vpc'
    });

    this.cluster = new ecs.Cluster(this, 'DiscordBotAndDashboardCluster', {
      vpc: this.vpc,
      clusterName: 'discord-bot-dashboard-cluster'
    });
  }
}
