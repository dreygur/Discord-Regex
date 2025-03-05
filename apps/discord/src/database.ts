import { DynamoDatabase } from '@discord/database';
import type { IDBClientOptions } from '@discord/database/dist/types';

const region = process.env.REGION;
const endpoint = process.env.ENDPOINT;
const accessKeyId = process.env.ACCESS_KEY_ID;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

let config: IDBClientOptions = {
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "Servers",
}

if (region && endpoint && accessKeyId && secretAccessKey) {
  config = {
    ...config,
    region, endpoint,
    credentials: {
      accessKeyId, secretAccessKey
    },
  };
}

const database = new DynamoDatabase(config);

export { database };