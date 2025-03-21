import { Client, Events, GatewayIntentBits, Guild, Interaction, Message, MessageFlags, OmitPartialGroupDMChannel } from 'discord.js';
import { commands } from './commands';
import { regexHandler } from './regex-handler';
import { database } from './database';
import { cache } from './cache';
import { IWebhook } from './types';

/**
 * Discord Bot client
 */
export const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ]
});

// Read TEXT message
client.on(Events.MessageCreate, (message: OmitPartialGroupDMChannel<Message<boolean>>) => {
  if (message.author.bot) return;
  try {
    regexHandler(message);
  } catch (error) {
    console.log(error);
  }
});

// Save a server when the bot is connected to it
client.on(Events.GuildCreate, async (guild: Guild) => {
  try {
    console.log('New server connected', guild.id, guild.name);
    await database.createServer(guild.id, guild.name, 'disabled', guild.memberCount);
  } catch (error) {
    console.log(error);
  }
});

// Do the autocompletion here
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    try {
      let choices: IWebhook[] | undefined = cache.get(interaction.guildId as string)?.webhooks;
      if (!choices) {
        choices = await database.getAllWebhooksByServerId(interaction.guildId as string);
        cache.set(interaction.guildId as string, { webhooks: choices });
      }

      await interaction.respond(
        choices.map(choice => ({ name: choice.name, value: choice.name }))
      );
    } catch (error) {
      console.error(error);
    }
  }
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "An error occurred while executing the command.",
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: "An error occurred while executing the command.",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
});