"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDatabase = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class DynamoDatabase {
    constructor(options) {
        this.client = new client_dynamodb_1.DynamoDBClient(options);
        this.db = lib_dynamodb_1.DynamoDBDocumentClient.from(this.client);
        this.webhooksTableName = options.webhooksTableName;
        this.regexTableName = options.regexTableName;
        this.serversTableName = options.serversTableName;
    }
    async tableExists(tableName) {
        try {
            await this.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
            return true;
        }
        catch (error) {
            if (error instanceof client_dynamodb_1.ResourceNotFoundException) {
                return false;
            }
            throw error;
        }
    }
    async createTables() {
        await this.createWebhooksTable();
        await this.createRegexTable();
        await this.createServersTable();
    }
    async createWebhooksTable() {
        if (await this.tableExists(this.webhooksTableName)) {
            console.log(`Table ${this.webhooksTableName} already exists`);
            return;
        }
        const command = new client_dynamodb_1.CreateTableCommand({
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
    async createRegexTable() {
        if (await this.tableExists(this.regexTableName)) {
            console.log(`Table ${this.regexTableName} already exists`);
            return;
        }
        const command = new client_dynamodb_1.CreateTableCommand({
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
    async createServersTable() {
        if (await this.tableExists(this.serversTableName)) {
            console.log(`Table ${this.serversTableName} already exists`);
            return;
        }
        const command = new client_dynamodb_1.CreateTableCommand({
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
    async handleTableCreation(command) {
        try {
            await this.client.send(command);
            console.log(`Table ${command.input.TableName} created successfully`);
            await this.waitForTableActive(command.input.TableName);
        }
        catch (error) {
            if (error instanceof client_dynamodb_1.ResourceInUseException) {
                console.log(`Table ${command.input.TableName} already exists`);
            }
            else {
                throw error;
            }
        }
    }
    async waitForTableActive(tableName) {
        const maxAttempts = 10;
        for (let i = 0; i < maxAttempts; i++) {
            const { Table } = await this.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
            if (Table?.TableStatus === "ACTIVE") {
                console.log(`Table ${tableName} is active`);
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error(`Table ${tableName} did not become active in time`);
    }
    // Webhooks Table Methods
    async createWebhook(name, url) {
        await this.db.send(new lib_dynamodb_1.PutCommand({
            TableName: this.webhooksTableName,
            Item: { name, url },
        }));
    }
    async getWebhook(name) {
        const result = await this.db.send(new lib_dynamodb_1.GetCommand({
            TableName: this.webhooksTableName,
            Key: { name },
        }));
        return result.Item || null;
    }
    // Add to your DynamoDatabase class
    async getAllWebhooks() {
        try {
            const result = await this.db.send(new lib_dynamodb_1.ScanCommand({
                TableName: this.webhooksTableName,
            }));
            return result.Items || [];
        }
        catch (error) {
            console.error("Error fetching webhooks:", error);
            throw error;
        }
    }
    // If you need pagination for large datasets, use this version:
    async getAllWebhooksPaginated() {
        const items = [];
        let lastEvaluatedKey = undefined;
        do {
            const result = await this.db.send(new lib_dynamodb_1.ScanCommand({
                TableName: this.webhooksTableName,
                ExclusiveStartKey: lastEvaluatedKey,
            }));
            if (result.Items) {
                items.push(...result.Items);
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        return items;
    }
    async getAllWebhooksByServerId(serverId) {
        try {
            // First get all regex patterns with their webhook references
            const regexPatterns = await this.db.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.regexTableName,
                KeyConditionExpression: "serverId = :serverId",
                ExpressionAttributeValues: { ":serverId": serverId },
            }));
            if (!regexPatterns.Items || regexPatterns.Items.length === 0) {
                return [];
            }
            // Extract unique webhook names
            const webhookNames = [...new Set(regexPatterns.Items.map(item => item.webhookName))];
            // Batch get webhook details
            const webhooksResponse = await this.db.send(new lib_dynamodb_1.BatchGetCommand({
                RequestItems: {
                    [this.webhooksTableName]: {
                        Keys: webhookNames.map(name => ({ name }))
                    }
                }
            }));
            return webhooksResponse.Responses?.[this.webhooksTableName] || [];
        }
        catch (error) {
            console.error(`Error fetching webhooks for server ${serverId}:`, error);
            throw error;
        }
    }
    async updateWebhook(name, newUrl) {
        await this.db.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.webhooksTableName,
            Key: { name },
            UpdateExpression: "SET #url = :url",
            ExpressionAttributeNames: { "#url": "url" },
            ExpressionAttributeValues: { ":url": newUrl },
        }));
    }
    async deleteWebhook(name) {
        await this.db.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.webhooksTableName,
            Key: { name },
        }));
    }
    // Regex Patterns Table Methods
    async addRegex(serverId, regexPattern, webhookName) {
        await this.db.send(new lib_dynamodb_1.PutCommand({
            TableName: this.regexTableName,
            Item: { serverId, regexPattern, webhookName },
        }));
    }
    async getRegexesByServer(serverId) {
        const result = await this.db.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.regexTableName,
            KeyConditionExpression: "serverId = :serverId",
            ExpressionAttributeValues: { ":serverId": serverId },
        }));
        return result.Items || [];
    }
    async updateRegexWebhook(serverId, regexPattern, newWebhookName) {
        await this.db.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.regexTableName,
            Key: { serverId, regexPattern },
            UpdateExpression: "SET webhookName = :whn",
            ExpressionAttributeValues: { ":whn": newWebhookName },
        }));
    }
    async deleteRegex(serverId, regexPattern) {
        await this.db.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.regexTableName,
            Key: { serverId, regexPattern },
        }));
    }
    // Discord Servers Table Methods
    async createServer(serverId, name, status, totalUsers, totalChannels) {
        await this.db.send(new lib_dynamodb_1.PutCommand({
            TableName: this.serversTableName,
            Item: { serverId, name, status, totalUsers, totalChannels },
        }));
    }
    async getServer(serverId) {
        const result = await this.db.send(new lib_dynamodb_1.GetCommand({
            TableName: this.serversTableName,
            Key: { serverId },
        }));
        return result.Item || null;
    }
    async updateServer(serverId, updates) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        Object.entries(updates).forEach(([key, value], index) => {
            updateExpressions.push(`#${key} = :val${index}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:val${index}`] = value;
        });
        if (updateExpressions.length === 0)
            return;
        await this.db.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.serversTableName,
            Key: { serverId },
            UpdateExpression: `SET ${updateExpressions.join(", ")}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        }));
    }
    async deleteServer(serverId) {
        await this.db.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.serversTableName,
            Key: { serverId },
        }));
    }
}
exports.DynamoDatabase = DynamoDatabase;
//# sourceMappingURL=index.js.map