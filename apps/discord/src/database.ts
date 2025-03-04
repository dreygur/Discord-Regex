import { DynamoDatabase } from '@discord/database';
import type { IDBClientOptions } from '@discord/database/dist/types';

const region = process.env.REGION as string;
const endpoint = process.env.ENDPOINT as string;
const accessKeyId = process.env.ACCESS_KEY_ID as string;
const secretAccessKey = process.env.SECRET_ACCESS_KEY as string;

let config: IDBClientOptions = {
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "DiscordServers",
}

if (region && endpoint && accessKeyId && secretAccessKey) {
  config = {
    ...config,
    region: process.env.REGION as string,
    endpoint: process.env.ENDPOINT as string,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID as string,
      secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
    },
  };
}

const database = new DynamoDatabase(config);

export { database };