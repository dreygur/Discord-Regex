import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction, SlashCommandStringOption } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("add-pattern")
    .setDescription("Allows to add a regex pattern for webhook")
    .addStringOption((option: SlashCommandStringOption) => option
      .setName("pattern")
      .setDescription("The regex pattern to add")
    )
    .addStringOption((option: SlashCommandStringOption) => option
      .setName("webhook")
      .setDescription("The webhook to send notifications")
      .setAutocomplete(true)
    )
  ,
  execute: async (interaction: CommandInteraction) => {
    try {
      await database.addRegex(
        interaction.guildId as string,
        interaction.options.get('pattern')?.value as string,
        interaction.options.get('webhook')?.value as string
      );

      await interaction.reply("Pong!");
    } catch (err) {
      console.error(err);
      await interaction.reply("An error occurred while adding the regex pattern.");
    }
  },
}

export { command };