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
  serversTableName: "Servers"
};

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

// @ts-ignore
// if (!global.__tablesCreated) {
//   // @ts-ignore
//   global.__tablesCreated = true;
//   (async () => {
//     try {
//       await database.createTables();
//       console.log("All tables created successfully");
//     } catch (error) {
//       console.error("Error creating tables:", error);
//     }
//   })();
// }

export { database };
