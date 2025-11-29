import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
  ResourceNotFoundException,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
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
import { validateRegexPattern, validateWebhookUrl, validateServerStatus } from "./validation";

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
        { AttributeName: "name", KeyType: "HASH" },
      ],
      AttributeDefinitions: [
        { AttributeName: "name", AttributeType: "S" },
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
      KeySchema: [
        { AttributeName: "serverId", KeyType: "HASH" },
      ],
      AttributeDefinitions: [
        { AttributeName: "serverId", AttributeType: "S" },
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
  async createWebhook(name: string, url: string, serverId: string, data: string): Promise<void> {
    // Validate webhook URL before persistence
    try {
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === 'production';
      validateWebhookUrl(url, isProduction);
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    await this.db.send(new PutCommand({
      TableName: this.webhooksTableName,
      Item: { name, url, serverId, data },
    }));
  }

  async getWebhook(name: string): Promise<{ name: string, url: string, serverId: string } | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.webhooksTableName,
      Key: { name },
    }));
    return result.Item as { name: string, url: string, serverId: string, data: string } || null;
  }

  // Add to your DynamoDatabase class
  async getAllWebhooks(): Promise<{ name: string, url: string, serverId: string }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
      }));

      return result.Items as { name: string, url: string, serverId: string, data: string }[] || [];
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      throw error;
    }
  }

  // If you need pagination for large datasets, use this version:
  async getAllWebhooksPaginated(): Promise<{ name: string, url: string, serverId: string }[]> {
    const items: { name: string, url: string, serverId: string }[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const result: ScanCommandOutput = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }));

      if (result.Items) {
        items.push(...result.Items as { name: string, url: string, serverId: string }[]);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
  }

  async getAllWebhooksByServerId(serverId: string): Promise<{ name: string, url: string, serverId: string, data: string }[]> {
    try {
      const webhooksResponse = await this.db.send(new ScanCommand({
        TableName: this.webhooksTableName,
        FilterExpression: "serverId = :serverId",
        ExpressionAttributeValues: { ":serverId": serverId },
      }));

      return (webhooksResponse.Items || []) as { name: string, url: string, serverId: string, data: string }[];
    } catch (error) {
      console.error(`Error fetching webhooks for server ${serverId}:`, error);
      throw error;
    }
  }

  async updateWebhook(name: string, url: string, serverId: string, data: string): Promise<void> {
    // Validate webhook URL before persistence
    try {
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === 'production';
      validateWebhookUrl(url, isProduction);
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    await this.db.send(new UpdateCommand({
      TableName: this.webhooksTableName,
      Key: { name },
      UpdateExpression: "SET #url = :url, #serverId = :serverId, #data = :data",
      ExpressionAttributeNames: { "#url": "url", "#serverId": "serverId", "#data": "data" },
      ExpressionAttributeValues: { ":url": url, ":serverId": serverId, ":data": data },
    }));
  }

  async deleteWebhook(name: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.webhooksTableName,
      Key: { name },
    }));
  }

  // Regex Patterns Table Methods
  async addRegex(serverId: string, regexPattern: string, webhookName: string, userIds?: string[]): Promise<void> {
    // Validate regex pattern before persistence
    try {
      validateRegexPattern(regexPattern);
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const item: any = { serverId, regexPattern, webhookName };
    // Always store user_ids, default to ['All']
    const finalUserIds = userIds && userIds.length > 0 ? userIds : ['All'];
    item.user_ids = new Set(finalUserIds);
    await this.db.send(new PutCommand({
      TableName: this.regexTableName,
      Item: item,
    }));
  }

  async getAllRegex(): Promise<{
    serverId: string;
    webhookName: string;
    regexPattern: string;
    user_ids?: string[];
  }[]> {
    try {
      const result = await this.db.send(new ScanCommand({
        TableName: this.regexTableName,
      }));

      return (result.Items || []).map(item => ({
        ...item,
        user_ids: item.user_ids ? Array.from(item.user_ids) : undefined
      })) as {
        serverId: string;
        webhookName: string;
        regexPattern: string;
        user_ids?: string[];
      }[];
    } catch (error) {
      console.error("Error fetching regex:", error);
      throw error;
    }
  }

  async getRegexesByServer(serverId: string): Promise<{ serverId: string; regexPattern: string; webhookName: string; user_ids?: string[] }[]> {
    try {
      // With the composite key, we can use a more efficient query operation
      const result = await this.db.send(new QueryCommand({
        TableName: this.regexTableName,
        KeyConditionExpression: "serverId = :serverId",
        ExpressionAttributeValues: { ":serverId": serverId },
      }));

      return (result.Items || []).map(item => ({
        ...item,
        user_ids: item.user_ids ? Array.from(item.user_ids) : undefined
      })) as { serverId: string; regexPattern: string; webhookName: string; user_ids?: string[] }[];
    } catch (error) {
      console.error(`Error fetching regexes for server ${serverId}:`, error);
      throw error;
    }
  }

  async updateRegexWebhook(serverId: string, regexPattern: string, newWebhookName: string): Promise<void> {
    try {
      // With the composite key, we can directly update the specific regex pattern
      await this.db.send(new UpdateCommand({
        TableName: this.regexTableName,
        Key: { serverId, regexPattern },
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
      user_ids?: string[];
    }
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key === 'user_ids' && Array.isArray(value)) {
        // Always store as Set, default to ['All'] if empty
        const userIds = value.length > 0 ? value : ['All'];
        updateExpressions.push(`#${key} = :val${index}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:val${index}`] = new Set(userIds);
      } else if (value !== undefined) {
        updateExpressions.push(`#${key} = :val${index}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:val${index}`] = value;
      }
    });

    if (updateExpressions.length === 0) return;

    await this.db.send(new UpdateCommand({
      TableName: this.regexTableName,
      Key: { serverId, regexPattern: pattern },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async deleteRegex(serverId: string, regexPattern: string): Promise<void> {
    try {
      // With the composite key, we can directly delete the specific regex pattern
      await this.db.send(new DeleteCommand({
        TableName: this.regexTableName,
        Key: { serverId, regexPattern }
      }));

      console.log(`Successfully deleted regex pattern "${regexPattern}" for server ${serverId}`);
    } catch (error) {
      console.error(`Error deleting regex pattern "${regexPattern}" for server ${serverId}:`, error);
      throw error;
    }
  }

  async getRegex(serverId: string, regexPattern: string): Promise<{ serverId: string; regexPattern: string; webhookName: string; user_ids?: string[] } | null> {
    try {
      const result = await this.db.send(new GetCommand({
        TableName: this.regexTableName,
        Key: { serverId, regexPattern }
      }));

      if (!result.Item) return null;
      
      return {
        ...result.Item,
        user_ids: result.Item.user_ids ? Array.from(result.Item.user_ids) : undefined
      } as { serverId: string; regexPattern: string; webhookName: string; user_ids?: string[] };
    } catch (error) {
      console.error(`Error fetching regex pattern "${regexPattern}" for server ${serverId}:`, error);
      throw error;
    }
  }

  // Discord Servers Table Methods
  async createServer(
    serverId: string,
    name: string,
    status: "active" | "disabled",
    totalUsers: number,
  ): Promise<void> {
    // Validate server status before persistence
    try {
      validateServerStatus(status);
    } catch (error) {
      throw new Error(`Invalid server status: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    await this.db.send(new PutCommand({
      TableName: this.serversTableName,
      Item: { serverId, name, status, totalUsers },
    }));
  }

  async getServer(serverId: string): Promise<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    email?: string;
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
      email?: string;
    } | null;
  }

  async getAllServers(): Promise<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    email?: string;
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
      name?: string;
      status?: "active" | "disabled";
      totalUsers?: number;
      email?: string | null;
    }
  ): Promise<void> {
    // Validate server status if it's being updated
    if (updates.status !== undefined) {
      try {
        validateServerStatus(updates.status);
      } catch (error) {
        throw new Error(`Invalid server status: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    const setExpressions: string[] = [];
    const removeExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      // If value is null or empty string, remove the attribute
      if (value === null || value === '') {
        removeExpressions.push(`#${key}`);
        expressionAttributeNames[`#${key}`] = key;
      } else {
        // Otherwise, set the attribute
        setExpressions.push(`#${key} = :val${index}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:val${index}`] = value;
      }
    });

    if (setExpressions.length === 0 && removeExpressions.length === 0) return;

    // Build the update expression
    const updateParts: string[] = [];
    if (setExpressions.length > 0) {
      updateParts.push(`SET ${setExpressions.join(", ")}`);
    }
    if (removeExpressions.length > 0) {
      updateParts.push(`REMOVE ${removeExpressions.join(", ")}`);
    }

    const updateCommand: any = {
      TableName: this.serversTableName,
      Key: { serverId },
      UpdateExpression: updateParts.join(" "),
      ExpressionAttributeNames: expressionAttributeNames,
    };

    // Only add ExpressionAttributeValues if we have SET operations
    if (Object.keys(expressionAttributeValues).length > 0) {
      updateCommand.ExpressionAttributeValues = expressionAttributeValues;
    }

    await this.db.send(new UpdateCommand(updateCommand));
  }

  async deleteServer(serverId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.serversTableName,
      Key: { serverId },
    }));
  }
}

export { DynamoDatabase };