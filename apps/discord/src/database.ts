import { DynamoDatabase } from '@discord/database';

const database = new DynamoDatabase({
  region: process.env.REGION as string,
  endpoint: process.env.ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "DiscordServers",
});

export { database };