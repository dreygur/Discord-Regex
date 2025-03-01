import { DynamoDatabase } from '@discord/database';

const database = new DynamoDatabase({
  region: 'us-west-2',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'jmj0pe',
    secretAccessKey: 'jkq4o6',
  },
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "DiscordServers",
});

export { database };