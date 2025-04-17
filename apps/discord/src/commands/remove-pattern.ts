import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction, SlashCommandStringOption } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("remove-pattern")
    .setDescription("Allows to remove a regex pattern")
    .addStringOption((option: SlashCommandStringOption) => option
      .setName("pattern")
      .setDescription("The regex pattern to remove")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: CommandInteraction) => {
    try {
      await database.deleteRegex(interaction.guildId as string, interaction.options.get('pattern')?.value as string);
      await interaction.reply("Removed regex pattern successfully");
    } catch (err) {
      console.error(err);
      await interaction.reply("An error occurred while removing the pattern.");
    }
  },
}

export { command };