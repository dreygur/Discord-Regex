import { DynamoDatabase } from '@discord/database';

const database = new DynamoDatabase({
  region: 'us-west-2',
  credentials: {
    accessKeyId: '',
    secretAccessKey: '',
  },
  serversTableName: 'servers',
  regexTableName: 'regextable',
  webhooksTableName: 'webhooks',
});

export { database };