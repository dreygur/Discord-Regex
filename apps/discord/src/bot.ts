import { Client, Events, GatewayIntentBits, Guild, Interaction, Message, MessageFlags, OmitPartialGroupDMChannel } from 'discord.js';
import { commands } from './commands';
import { regexHandler } from './regex-handler';
import { database } from './database';

// Discord Bot client
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
    console.log('New server connected', guild);
    await database.createServer(guild.id, guild.name, 'disabled', guild.memberCount);
  } catch (error) {
    console.log(error);
  }
});

// Register all the slash commands
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    try {
      // Do the autocompletion here
      // const focusValue = interaction.options.getFocused(true);
      const choices: { name: string; url: string }[] = await database.getAllWebhooksByServerId(interaction.guildId as string);

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