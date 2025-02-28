import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, REST, Routes } from "discord.js";
import { BotCommand } from "./types";
import { config } from './config';

// Commands
export const commands: Collection<string, { command: BotCommand }> = new Collection();
const commandsPath: string = path.join(__dirname, 'commands');
const commandsDirs: Array<string> = fs.readdirSync(commandsPath);

// Load all command files
for (const file of commandsDirs) {
  const filePath = path.join(commandsPath, file);
  const commandScript: Promise<{ command: BotCommand }> = import(filePath);
  commandScript.then((command: { command: BotCommand }) => {
    const keys = Object.keys(command.command);
    if (keys.includes('data') && keys.includes('execute')) {
      commands.set(command.command.data.name, command);
      console.log(`Loaded command: ${command.command.data.name}`);
    }
  })
    .catch(() => console.error("Failed to load command"));
}

// Discord REST API
const rest = new REST().setToken(config.token);

export async function registerCommands(client: Client) {
  console.log("Starting");
  const applicationId = client.application?.id;
  if (!applicationId) return;
  const data: any = await rest.put(
    Routes.applicationCommands(applicationId),
    {
      body: commands.map(command => command.command.data.toJSON())
    }
  );

  console.log(`Successfully registered ${data.length} commands.`);
}