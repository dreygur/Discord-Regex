#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DiscordBotStack } from '../lib/discord-bot-stack';
// import { DashboardStack } from '../lib/dashboard-stack';
// import { DynamoDBStack } from '../lib/dynamodb-stack';

const app = new cdk.App();
// new DynamoDBStack(app, 'DynamoDBStack');
new DiscordBotStack(app, 'DiscordBotStack');
// new DashboardStack(app, 'DashboardStack');

// app.synth();