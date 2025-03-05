/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DynamoDatabase } from "@discord/database";
import type { IDBClientOptions } from "@discord/database/dist/types";

const region = process.env.NEXT_REGION;
const endpoint = process.env.NEXT_ENDPOINT;
const accessKeyId = process.env.NEXT_ACCESS_KEY_ID;
const secretAccessKey = process.env.NEXT_SECRET_ACCESS_KEY;

let config: IDBClientOptions = {
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "DiscordServers"
};

if (region && endpoint && accessKeyId && secretAccessKey) {
  config = {
    ...config,
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };
}

const database = new DynamoDatabase(config);

// @ts-ignore
if (!global.__tablesCreated) {
  // @ts-ignore
  global.__tablesCreated = true;
  (async () => {
    try {
      await database.createTables();
      console.log("All tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
    }
  })();
}

export { database };
