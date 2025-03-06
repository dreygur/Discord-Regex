import { config as envConfig } from "dotenv";
envConfig();

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

function start() {
  // When the client is ready show som logs
  client.once(Events.ClientReady, (readyClient: Client<true>) => {
    console.log(`Logged in as ${readyClient.user.tag}`)
  });

  // Login to Discord using the client token
  client
    .login(config.token as string)
    .then(async () => {
      await initializeDatabase();
      await registerCommands(client);
    })
    .catch(console.error);
}
start();

// process.on("unhandledRejection", (reason, promise) => {
//   console.log(reason, "\n", promise);

//   start();
// });

// process.on("uncaughtException", (err, origin) => {
//   console.log(err, "\n", origin);

//   start();
// });

// process.on("uncaughtExceptionMonitor", (err, origin) => {
//   console.log(err, "\n", origin);

//   start();
// });

// process.on("warning", (warn) => {
//   console.log(warn);

//   start();
// });