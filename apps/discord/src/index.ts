import { Client, Events } from "discord.js";
import { client } from "./bot";
import { registerCommands } from "./commands";
import { config } from "./config";

// When the client is ready show som logs
client.once(Events.ClientReady, (readyClient: Client<true>) => {
  console.log(`Logged in as ${readyClient.user.tag}`)
});

// Login to Discord using the client token
client
  .login(config.token)
  .then(async () => await registerCommands(client))
  .catch(console.error);
