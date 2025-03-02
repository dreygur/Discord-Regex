#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DiscordBotStack } from '../lib/discord-bot-stack';
import { DashboardStack } from '../lib/dashboard-stack';
// import { DynamoDBStack } from '../lib/dynamodb-stack';

const app = new cdk.App();
new DiscordBotStack(app, 'DiscordBotStack');
// new DashboardStack(app, 'DashboardStack');
// new DynamoDBStack(app, 'DynamoDBStack');

// app.synth();