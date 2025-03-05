import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class ClusterStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the VPC with NAT Gateway
    this.vpc = new ec2.Vpc(this, 'DiscordBotAndDashboardVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Create the cluster with the VPC
    this.cluster = new ecs.Cluster(this, 'DiscordBotAndDashboardCluster', {
      vpc: this.vpc,
    });
  }
}
