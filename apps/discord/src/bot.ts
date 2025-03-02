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
  regexHandler(message);
});

// Save a server when the bot is connected to it
client.on(Events.GuildCreate, async (guild: Guild) => {
  // await database.createServer(guild.id, guild.name, 'disabled', guild.memberCount, 0);
  await database.createServer(guild.id, guild.name, 'active', guild.memberCount, 0);
});

// Register all the slash commands
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    // Do the autocompletion here
    // const focusValue = interaction.options.getFocused(true);
    const choices: { name: string; url: string }[] = await database.getAllWebhooks();

    await interaction.respond(
      choices.map(choice => ({ name: choice.name, value: choice.name }))
    );

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