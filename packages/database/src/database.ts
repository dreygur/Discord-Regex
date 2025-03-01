import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, ScanCommandOutput, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { IDBClientOptions } from "./types";

class DynamoDatabase {
  private client: DynamoDBClient;
  private db: DynamoDBDocumentClient;
  private webhooksTableName: string;
  private regexTableName: string;
  private serversTableName: string;

  constructor(options: IDBClientOptions) {
    this.client = new DynamoDBClient(options);
    this.db = DynamoDBDocumentClient.from(this.client);
    this.webhooksTableName = options.webhooksTableName;
    this.regexTableName = options.regexTableName;
    this.serversTableName = options.serversTableName;
  }

  private async tableExists(tableName: string): Promise<boolean> {
    try {
      await this.client.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      return true;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return false;
      }
      throw error;
    }
  }

  async createTables(): Promise<void> {
    await this.createWebhooksTable();
    await this.createRegexTable();
    await this.createServersTable();
  }

  private async createWebhooksTable(): Promise<void> {
    if (await this.tableExists(this.webhooksTableName)) {
      console.log(`Table ${this.webhooksTableName} already exists`);
      return;
    }

    const command = new CreateTableCommand({
      TableName: this.webhooksTableName,
      AttributeDefinitions: [{ AttributeName: "name", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "name", KeyType: "HASH" }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    });

    await this.handleTableCreation(command);
  }

  private async createRegexTable(): Promise<void> {
    if (await this.tableExists(this.regexTableName)) {
      console.log(`Table ${this.regexTableName} already exists`);
      return;
    }

    const command = new CreateTableCommand({
      TableName: this.regexTableName,
      AttributeDefinitions: [
        { AttributeName: "serverId", AttributeType: "S" },
        { AttributeName: "regexPattern", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "serverId", KeyType: "HASH" },
        { AttributeName: "regexPattern", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    });

    await this.handleTableCreation(command);
  }

  private async createServersTable(): Promise<void> {
    if (await this.tableExists(this.serversTableName)) {
      console.log(`Table ${this.serversTableName} already exists`);
      return;
    }

    const command = new CreateTableCommand({
      TableName: this.serversTableName,
      AttributeDefinitions: [{ AttributeName: "serverId", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "serverId", KeyType: "HASH" }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    });

    await this.handleTableCreation(command);
  }

  private async handleTableCreation(command: CreateTableCommand): Promise<void> {
    try {
      await this.client.send(command);
      console.log(`Table ${command.input.TableName} created successfully`);
      await this.waitForTableActive(command.input.TableName!);
    } catch (error) {
      if (error instanceof ResourceInUseException) {
        console.log(`Table ${command.input.TableName} already exists`);
      } else {
        throw error;
      }
    }
  }

  private async waitForTableActive(tableName: string): Promise<void> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const { Table } = await this.client.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      if (Table?.TableStatus === "ACTIVE") {
        console.log(`Table ${tableName} is active`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Table ${tableName} did not become active in time`);
  }

  // Webhooks Table Methods
  async createWebhook(name: string, url: string): Promise<void> {
    await this.db.send(new PutCommand({
      TableName: this.webhooksTableName,
      Item: { name, url },
    }));
  }

  async getWebhook(name: string): Promise<{ name: string; url: string } | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.webhooksTableName,
      Key: { name },
    }));
    return result.Item as { name: string; url: string } || null;
  }

  // Add to your DynamoDatabase class
  async getAllWebhooks(): Promise<{ name: string; url: string }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
      }));

      return result.Items as { name: string; url: string }[] || [];
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      throw error;
    }
  }

  // If you need pagination for large datasets, use this version:
  async getAllWebhooksPaginated(): Promise<{ name: string; url: string }[]> {
    const items: { name: string; url: string }[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const result: ScanCommandOutput = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }));

      if (result.Items) {
        items.push(...result.Items as { name: string; url: string }[]);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
  }

  async getAllWebhooksByServerId(serverId: string): Promise<{ name: string; url: string }[]> {
    try {
      // First get all regex patterns with their webhook references
      const regexPatterns = await this.db.send(new QueryCommand({
        TableName: this.regexTableName,
        KeyConditionExpression: "serverId = :serverId",
        ExpressionAttributeValues: { ":serverId": serverId },
      }));

      if (!regexPatterns.Items || regexPatterns.Items.length === 0) {
        return [];
      }

      // Extract unique webhook names
      const webhookNames = [...new Set(
        regexPatterns.Items.map(item => item.webhookName)
      )] as string[];

      // Batch get webhook details
      const webhooksResponse = await this.db.send(new BatchGetCommand({
        RequestItems: {
          [this.webhooksTableName]: {
            Keys: webhookNames.map(name => ({ name }))
          }
        }
      }));

      return webhooksResponse.Responses?.[this.webhooksTableName] as { name: string; url: string }[] || [];
    } catch (error) {
      console.error(`Error fetching webhooks for server ${serverId}:`, error);
      throw error;
    }
  }

  async updateWebhook(name: string, newUrl: string): Promise<void> {
    await this.db.send(new UpdateCommand({
      TableName: this.webhooksTableName,
      Key: { name },
      UpdateExpression: "SET #url = :url",
      ExpressionAttributeNames: { "#url": "url" },
      ExpressionAttributeValues: { ":url": newUrl },
    }));
  }

  async deleteWebhook(name: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.webhooksTableName,
      Key: { name },
    }));
  }

  // Regex Patterns Table Methods
  async addRegex(serverId: string, regexPattern: string, webhookName: string): Promise<void> {
    await this.db.send(new PutCommand({
      TableName: this.regexTableName,
      Item: { serverId, regexPattern, webhookName },
    }));
  }

  async getRegexesByServer(serverId: string): Promise<{ serverId: string; regexPattern: string; webhookName: string }[]> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.regexTableName,
      KeyConditionExpression: "serverId = :serverId",
      ExpressionAttributeValues: { ":serverId": serverId },
    }));
    return result.Items as { serverId: string; regexPattern: string; webhookName: string }[] || [];
  }

  async updateRegexWebhook(serverId: string, regexPattern: string, newWebhookName: string): Promise<void> {
    await this.db.send(new UpdateCommand({
      TableName: this.regexTableName,
      Key: { serverId, regexPattern },
      UpdateExpression: "SET webhookName = :whn",
      ExpressionAttributeValues: { ":whn": newWebhookName },
    }));
  }

  async deleteRegex(serverId: string, regexPattern: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.regexTableName,
      Key: { serverId, regexPattern },
    }));
  }

  // Discord Servers Table Methods
  async createServer(
    serverId: string,
    name: string,
    status: "active" | "disabled",
    totalUsers: number,
    totalChannels: number
  ): Promise<void> {
    await this.db.send(new PutCommand({
      TableName: this.serversTableName,
      Item: { serverId, name, status, totalUsers, totalChannels },
    }));
  }

  async getServer(serverId: string): Promise<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    totalChannels: number;
  } | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.serversTableName,
      Key: { serverId },
    }));
    return result.Item as {
      serverId: string;
      name: string;
      status: "active" | "disabled";
      totalUsers: number;
      totalChannels: number;
    } || null;
  }

  async getAllServers(): Promise<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    totalChannels: number;
  }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.serversTableName,
      }));

      return result.Items as {
        serverId: string;
        name: string;
        status: "active" | "disabled";
        totalUsers: number;
        totalChannels: number;
      }[];
    } catch (error) {
      console.error("Error fetching servers:", error);
      throw error;
    }
  }

  async updateServer(
    serverId: string,
    updates: {
      name?: string;
      status?: "active" | "disabled";
      totalUsers?: number;
      totalChannels?: number;
    }
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExpressions.push(`#${key} = :val${index}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:val${index}`] = value;
    });

    if (updateExpressions.length === 0) return;

    await this.db.send(new UpdateCommand({
      TableName: this.serversTableName,
      Key: { serverId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async deleteServer(serverId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.serversTableName,
      Key: { serverId },
    }));
  }
}

export { DynamoDatabase };