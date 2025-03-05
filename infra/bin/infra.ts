#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClusterStack } from '../lib/cluster-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { DiscordBotStack } from '../lib/discord-bot-stack';
import { DashboardStack } from '../lib/dashboard-stack';

const app = new cdk.App();

// Define the environment for all stacks
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// First, create the DynamoDB stack to create the tables
const dbStack = new DynamoDBStack(app, 'DynamoDBStack', { env });

// Then, create the Cluster stack to create the cluster
const clusterStack = new ClusterStack(app, 'ClusterStack', { env });

// Then, create the Discord bot stack and pass the tables as props
new DiscordBotStack(app, 'DiscordBotStack', {
  cluster: clusterStack.cluster,
  vpc: clusterStack.vpc,
  webhooksTable: dbStack.webhooksTable,
  regexTable: dbStack.regexTable,
  serversTable: dbStack.serversTable,
  env,
});

// Then, create the Discord bot stack and pass the tables as props
new DashboardStack(app, 'DashboardStack', {
  cluster: clusterStack.cluster,
  vpc: clusterStack.vpc,
  webhooksTable: dbStack.webhooksTable,
  regexTable: dbStack.regexTable,
  serversTable: dbStack.serversTable,
  env,
});

// app.synth();