import { DynamoDatabase } from "@discord/database";
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
    region: process.env.NEXT_REGION as string,
    endpoint: process.env.NEXT_ENDPOINT as string,
    credentials: {
      accessKeyId: process.env.NEXT_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.NEXT_SECRET_ACCESS_KEY as string
    },
  };
}

const database = new DynamoDatabase(config);

// (async () => {
//   try {
//     if (!created) {
//       await database.createTables();
//       console.log("All tables created successfully");
//     }
//   } catch (error) {
//     console.error("Error creating tables:", error);
//   }
// })();

export { database };
