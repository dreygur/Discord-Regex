import { DynamoDatabase } from '@discord/database';
import type { IDBClientOptions } from '@discord/database/dist/types';

const region = process.env.REGION;
const endpoint = process.env.ENDPOINT;
const accessKeyId = process.env.ACCESS_KEY_ID;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

// Debug AWS config (using console.log to avoid circular dependency)
if (process.env.DEBUG === 'true') {
  console.log('AWS Config Debug:');
  console.log('REGION:', region);
  console.log('ENDPOINT:', endpoint);
  console.log('ACCESS_KEY_ID exists:', !!accessKeyId);
  console.log('SECRET_ACCESS_KEY exists:', !!secretAccessKey);
}

let config: IDBClientOptions = {
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "Servers",
}

if (region) {
  config.region = region;
}

if (endpoint) {
  config.endpoint = endpoint;
}

if (accessKeyId && secretAccessKey) {
  config.credentials = {
    accessKeyId,
    secretAccessKey
  };
}

const database = new DynamoDatabase(config);

export { database };