import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

class DynamoDBStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Webhooks table
    const webhooksTable = new dynamodb.Table(this, 'WebhooksTable', {
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      tableName: 'Webhooks',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Create Regex Patterns table
    const regexTable = new dynamodb.Table(this, 'RegexTable', {
      partitionKey: { name: 'serverId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'regexPattern', type: dynamodb.AttributeType.STRING },
      tableName: 'RegexPatterns',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Create Servers table
    const serversTable = new dynamodb.Table(this, 'ServersTable', {
      partitionKey: { name: 'serverId', type: dynamodb.AttributeType.STRING },
      tableName: 'Servers',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Output the table names
    new cdk.CfnOutput(this, 'WebhooksTableName', {
      value: webhooksTable.tableName,
      description: 'The name of the webhooks table',
      exportName: 'WebhooksTableName',
    });

    new cdk.CfnOutput(this, 'RegexTableName', {
      value: regexTable.tableName,
      description: 'The name of the regex patterns table',
      exportName: 'RegexTableName',
    });

    new cdk.CfnOutput(this, 'ServersTableName', {
      value: serversTable.tableName,
      description: 'The name of the servers table',
      exportName: 'ServersTableName',
    });
  }
}

export { DynamoDBStack };