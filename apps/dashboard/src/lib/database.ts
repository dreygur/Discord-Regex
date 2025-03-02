import { DynamoDatabase } from "@discord/database";

const database = new DynamoDatabase({
  region: process.env.NEXT_REGION as string,
  endpoint: process.env.NEXT_ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.NEXT_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.NEXT_SECRET_ACCESS_KEY as string
  },
  webhooksTableName: "Webhooks",
  regexTableName: "RegexPatterns",
  serversTableName: "DiscordServers"
});

(async () => {
  try {
    await database.createTables();
    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
})();

export { database };
