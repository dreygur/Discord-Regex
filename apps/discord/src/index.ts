import { config as envConfig } from "dotenv";
import path from "path";

// Debug current directory
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Try loading .env.local from multiple possible locations
const envPaths = [
  path.join(__dirname, '../.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), 'apps/discord/.env.local')
];

envPaths.forEach(envPath => {
  console.log('Trying to load:', envPath);
  envConfig({ path: envPath });
});

// Import debug after env is loaded
const { debug } = require('./debug');

// Debug: Check if environment variables are loaded
debug.log('Environment check:');
debug.log('TOKEN exists:', !!process.env.TOKEN);
debug.log('TOKEN value:', process.env.TOKEN ? process.env.TOKEN.substring(0, 10) + '...' : 'undefined');
debug.log('THUMBNAIL exists:', !!process.env.THUMBNAIL);

import { Client, Events } from "discord.js";
import { client } from "./bot";
import { registerCommands } from "./commands";
import { config } from "./config";
import { database } from "./database";
import { createHealthCheckServer } from "./health";

async function initializeDatabase() {
  try {
    await database.createTables();

    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

function start() {
  // Debug: Check if token is loaded
  debug.log('Token loaded:', config.token ? 'Yes' : 'No');
  debug.log('Token length:', config.token ? config.token.length : 0);
  debug.log('Token starts with:', config.token ? config.token.substring(0, 10) + '...' : 'undefined');
  
  // When the client is ready show som logs
  client.once(Events.ClientReady, (readyClient: Client<true>) => {
    console.log(`Logged in as ${readyClient.user.tag}`, readyClient.user.id);
  });

  // Login to Discord using the client token
  client
    .login(config.token as string)
    .then(async () => {
      // await initializeDatabase();
      await registerCommands(client);
      
      // Start health check server
      const healthPort = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 8080;
      createHealthCheckServer(client, healthPort);
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