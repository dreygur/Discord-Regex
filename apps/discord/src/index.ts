import { Client, Events } from "discord.js";
import { client } from "./bot";
import { registerCommands } from "./commands";
import { config } from "./config";
import { database } from "./database";

async function initializeDatabase() {
  try {
    await database.createTables();
    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

// When the client is ready show som logs
client.once(Events.ClientReady, (readyClient: Client<true>) => {
  console.log(`Logged in as ${readyClient.user.tag}`)
});

// Login to Discord using the client token
client
  .login(config.token)
  .then(async () => {
    await initializeDatabase();
    await registerCommands(client);
  })
  .catch(console.error);
