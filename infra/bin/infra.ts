#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DiscordBotStack } from '../lib/discord-bot-stack';
// import { DashboardStack } from '../lib/dashboard-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';

const app = new cdk.App();

// First, create the DynamoDB stack to create the tables
const dbStack = new DynamoDBStack(app, 'DynamoDBStack');

// Then, create the Discord bot stack and pass the tables as props
new DiscordBotStack(app, 'DiscordBotStack', {
  webhooksTable: dbStack.webhooksTable,
  regexTable: dbStack.regexTable,
  serversTable: dbStack.serversTable,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// new DashboardStack(app, 'DashboardStack');

app.synth();