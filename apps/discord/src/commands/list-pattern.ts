import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction, SlashCommandStringOption } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("list-pattern")
    .setDescription("Lists all regex pattern")
  ,
  execute: async (interaction: CommandInteraction) => {
    try {
      const patterns = await database.getRegexesByServer(interaction.guildId as string);
      if (patterns.length === 0) {
        await interaction.reply("No patterns found.");
        return;
      }
      await interaction.reply(`Patterns:\n${patterns.map(pattern => `${pattern.regexPattern} : ${pattern.webhookName}`).join("\n")}`);
    } catch (err) {
      console.error(err);
      await interaction.reply("An error occurred while listing the patterns.");
    }
  },
}

export { command };