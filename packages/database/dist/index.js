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