import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  ScanCommandOutput,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { IDBClientOptions } from "./types";
import { v4 as uuidv4 } from 'uuid';

class DynamoDatabase {
  private client: DynamoDBClient;
  private db: DynamoDBDocumentClient;
  private webhooksTableName: string;
  private regexTableName: string;
  private serversTableName: string;

  constructor(options: IDBClientOptions) {
    if (!options.region) {
      this.client = new DynamoDBClient();
    } else {
      this.client = new DynamoDBClient(options);
    }
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
      KeySchema: [
        { AttributeName: "id", KeyType: "HASH" },
      ],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "webhookName", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "NameIndex",
          KeySchema: [
            { AttributeName: "webhookName", KeyType: "HASH" },
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
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
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "serverId", AttributeType: "S" },
        { AttributeName: "regexPattern", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "id", KeyType: "HASH" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "ServerRegexIndex",
          KeySchema: [
            { AttributeName: "serverId", KeyType: "HASH" },
            { AttributeName: "regexPattern", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
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
      KeySchema: [
        { AttributeName: "id", KeyType: "HASH" },
      ],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "serverId", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "ServerIdIndex",
          KeySchema: [
            { AttributeName: "serverId", KeyType: "HASH" },
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
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
  async createWebhook(webhookName: string, url: string, serverId: string): Promise<string> {
    const id = uuidv4();
    await this.db.send(new PutCommand({
      TableName: this.webhooksTableName,
      Item: { id, webhookName, url, serverId },
    }));
    return id;
  }

  async getWebhook(webhookName: string): Promise<{ id: string, webhookName: string, url: string, serverId: string } | null> {
    // Query using the GSI for name
    const result = await this.db.send(new QueryCommand({
      TableName: this.webhooksTableName,
      IndexName: "NameIndex",
      KeyConditionExpression: "webhookName = :webhookName",
      ExpressionAttributeValues: { ":webhookName": webhookName },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as { id: string, webhookName: string, url: string, serverId: string };
  }

  async getWebhookById(id: string): Promise<{ id: string, webhookName: string, url: string, serverId: string } | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.webhooksTableName,
      Key: { id },
    }));
    return result.Item as { id: string, webhookName: string, url: string, serverId: string } || null;
  }

  // Add to your DynamoDatabase class
  async getAllWebhooks(): Promise<{ id: string, webhookName: string, url: string, serverId: string }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
      }));

      return result.Items as { id: string, webhookName: string, url: string, serverId: string }[] || [];
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      throw error;
    }
  }

  // If you need pagination for large datasets, use this version:
  async getAllWebhooksPaginated(): Promise<{ id: string, webhookName: string, url: string, serverId: string }[]> {
    const items: { id: string, webhookName: string, url: string, serverId: string }[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const result: ScanCommandOutput = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }));

      if (result.Items) {
        items.push(...result.Items as { id: string, webhookName: string, url: string, serverId: string }[]);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
  }

  async getAllWebhooksByServerId(serverId: string): Promise<{ id: string, webhookName: string, url: string, serverId: string }[]> {
    try {
      const webhooksResponse = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
        FilterExpression: "serverId = :serverId",
        ExpressionAttributeValues: { ":serverId": serverId },
      }));

      return (webhooksResponse.Items || []) as { id: string, webhookName: string, url: string, serverId: string }[];
    } catch (error) {
      console.error(`Error fetching webhooks for server ${serverId}:`, error);
      throw error;
    }
  }

  async updateWebhook(webhookName: string, url: string, serverId: string): Promise<void> {
    // First get the webhook by name to find its ID
    const webhook = await this.getWebhook(webhookName);
    if (!webhook) {
      throw new Error(`Webhook with name ${webhookName} not found`);
    }

    await this.db.send(new UpdateCommand({
      TableName: this.webhooksTableName,
      Key: { id: webhook.id },
      UpdateExpression: "SET #url = :url, #serverId = :serverId, #webhookName = :webhookName",
      ExpressionAttributeNames: { "#url": "url", "#serverId": "serverId", "#webhookName": "webhookName" },
      ExpressionAttributeValues: { ":url": url, ":serverId": serverId, ":webhookName": webhookName },
    }));
  }

  async deleteWebhook(webhookName: string): Promise<void> {
    // First get the webhook by name to find its ID
    const webhook = await this.getWebhook(webhookName);
    if (!webhook) {
      throw new Error(`Webhook with name ${webhookName} not found`);
    }

    await this.db.send(new DeleteCommand({
      TableName: this.webhooksTableName,
      Key: { id: webhook.id },
    }));
  }

  // Regex Patterns Table Methods
  async addRegex(serverId: string, regexPattern: string, webhookName: string): Promise<string> {
    const id = uuidv4();
    await this.db.send(new PutCommand({
      TableName: this.regexTableName,
      Item: { id, serverId, regexPattern, webhookName },
    }));
    return id;
  }

  async getAllRegex(): Promise<{
    id: string;
    serverId: string;
    webhookName: string;
    regexPattern: string;
  }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.regexTableName,
      }));

      return result.Items as {
        id: string;
        serverId: string;
        webhookName: string;
        regexPattern: string;
      }[];
    } catch (error) {
      console.error("Error fetching regex:", error);
      throw error;
    }
  }

  async getRegexesByServer(serverId: string): Promise<{ id: string; serverId: string; regexPattern: string; webhookName: string }[]> {
    try {
      // Use the GSI to query by serverId
      const result = await this.db.send(new QueryCommand({
        TableName: this.regexTableName,
        IndexName: "ServerRegexIndex",
        KeyConditionExpression: "serverId = :serverId",
        ExpressionAttributeValues: { ":serverId": serverId },
      }));

      return result.Items as { id: string; serverId: string; regexPattern: string; webhookName: string }[] || [];
    } catch (error) {
      console.error(`Error fetching regexes for server ${serverId}:`, error);
      throw error;
    }
  }

  async updateRegexWebhook(serverId: string, regexPattern: string, newWebhookName: string): Promise<void> {
    try {
      // First get the regex by serverId and regexPattern to find its ID
      const regex = await this.getRegex(serverId, regexPattern);
      if (!regex) {
        throw new Error(`Regex pattern "${regexPattern}" for server ${serverId} not found`);
      }

      await this.db.send(new UpdateCommand({
        TableName: this.regexTableName,
        Key: { id: regex.id },
        UpdateExpression: "SET webhookName = :whn",
        ExpressionAttributeValues: { ":whn": newWebhookName },
      }));

      console.log(`Successfully updated webhook name for regex pattern "${regexPattern}" to "${newWebhookName}"`);
    } catch (error) {
      console.error(`Error updating webhook name for regex pattern "${regexPattern}":`, error);
      throw error;
    }
  }

  async updateRegex(
    serverId: string,
    pattern: string,
    updates: {
      webhookName?: string;
    }
  ): Promise<void> {
    // First get the regex by serverId and pattern to find its ID
    const regex = await this.getRegex(serverId, pattern);
    if (!regex) {
      throw new Error(`Regex pattern "${pattern}" for server ${serverId} not found`);
    }

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
      TableName: this.regexTableName,
      Key: { id: regex.id },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async deleteRegex(serverId: string, regexPattern: string): Promise<void> {
    try {
      // First get the regex by serverId and regexPattern to find its ID
      const regex = await this.getRegex(serverId, regexPattern);
      if (!regex) {
        throw new Error(`Regex pattern "${regexPattern}" for server ${serverId} not found`);
      }

      await this.db.send(new DeleteCommand({
        TableName: this.regexTableName,
        Key: { id: regex.id }
      }));

      console.log(`Successfully deleted regex pattern "${regexPattern}" for server ${serverId}`);
    } catch (error) {
      console.error(`Error deleting regex pattern "${regexPattern}" for server ${serverId}:`, error);
      throw error;
    }
  }

  async getRegex(serverId: string, regexPattern: string): Promise<{ id: string; serverId: string; regexPattern: string; webhookName: string } | null> {
    try {
      // Use the GSI to query by serverId and regexPattern
      const result = await this.db.send(new QueryCommand({
        TableName: this.regexTableName,
        IndexName: "ServerRegexIndex",
        KeyConditionExpression: "serverId = :serverId AND regexPattern = :regexPattern",
        ExpressionAttributeValues: {
          ":serverId": serverId,
          ":regexPattern": regexPattern
        },
        Limit: 1
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return result.Items[0] as { id: string; serverId: string; regexPattern: string; webhookName: string };
    } catch (error) {
      console.error(`Error fetching regex pattern "${regexPattern}" for server ${serverId}:`, error);
      throw error;
    }
  }

  // Discord Servers Table Methods
  async createServer(
    serverId: string,
    serverName: string,
    status: "active" | "disabled",
    totalUsers: number,
  ): Promise<string> {
    const id = uuidv4();
    await this.db.send(new PutCommand({
      TableName: this.serversTableName,
      Item: { id, serverId, serverName, status, totalUsers },
    }));
    return id;
  }

  async getServer(serverId: string): Promise<{
    id: string;
    serverId: string;
    serverName: string;
    status: "active" | "disabled";
    totalUsers: number;
    email?: string;
  } | null> {
    // Use the GSI to query by serverId
    const result = await this.db.send(new QueryCommand({
      TableName: this.serversTableName,
      IndexName: "ServerIdIndex",
      KeyConditionExpression: "serverId = :serverId",
      ExpressionAttributeValues: { ":serverId": serverId },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as {
      id: string;
      serverId: string;
      serverName: string;
      status: "active" | "disabled";
      totalUsers: number;
      email?: string;
    };
  }

  async getAllServers(): Promise<{
    id: string;
    serverId: string;
    serverName: string;
    status: "active" | "disabled";
    totalUsers: number;
    email?: string;
  }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.serversTableName,
      }));

      return result.Items as {
        id: string;
        serverId: string;
        serverName: string;
        status: "active" | "disabled";
        totalUsers: number;
        email?: string;
      }[];
    } catch (error) {
      console.error("Error fetching servers:", error);
      throw error;
    }
  }

  async updateServer(
    serverId: string,
    updates: {
      serverName?: string;
      status?: "active" | "disabled";
      totalUsers?: number;
      email?: string;
    }
  ): Promise<void> {
    // First get the server by serverId to find its ID
    const server = await this.getServer(serverId);
    if (!server) {
      throw new Error(`Server with serverId ${serverId} not found`);
    }

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
      Key: { id: server.id },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async deleteServer(serverId: string): Promise<void> {
    // First get the server by serverId to find its ID
    const server = await this.getServer(serverId);
    if (!server) {
      throw new Error(`Server with serverId ${serverId} not found`);
    }

    await this.db.send(new DeleteCommand({
      TableName: this.serversTableName,
      Key: { id: server.id },
    }));
  }
}

export { DynamoDatabase };