import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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