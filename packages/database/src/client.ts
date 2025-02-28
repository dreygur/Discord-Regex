import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({
  region: "us-east-1", // Any AWS region, not relevant for local
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId", // Dummy values for local setup
    secretAccessKey: "fakeSecretAccessKey",
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

export { dynamoDBClient, docClient };
