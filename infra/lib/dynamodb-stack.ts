import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class DynamoDBStack extends cdk.Stack {
  // Export tables as public properties
  public readonly webhooksTable: dynamodb.Table;
  public readonly regexTable: dynamodb.Table;
  public readonly serversTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Webhooks table
    this.webhooksTable = new dynamodb.Table(this, 'WebhooksTable', {
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      tableName: 'Webhooks',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Create Regex Patterns table
    this.regexTable = new dynamodb.Table(this, 'RegexTable', {
      partitionKey: { name: 'serverId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'regexPattern', type: dynamodb.AttributeType.STRING },
      tableName: 'RegexPatterns',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Create Servers table
    this.serversTable = new dynamodb.Table(this, 'ServersTable', {
      partitionKey: { name: 'serverId', type: dynamodb.AttributeType.STRING },
      tableName: 'Servers',
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Output the table names
    new cdk.CfnOutput(this, 'WebhooksTableName', {
      value: this.webhooksTable.tableName,
      description: 'The name of the webhooks table',
      exportName: 'WebhooksTableName',
    });

    new cdk.CfnOutput(this, 'RegexTableName', {
      value: this.regexTable.tableName,
      description: 'The name of the regex patterns table',
      exportName: 'RegexTableName',
    });

    new cdk.CfnOutput(this, 'ServersTableName', {
      value: this.serversTable.tableName,
      description: 'The name of the servers table',
      exportName: 'ServersTableName',
    });
  }
}