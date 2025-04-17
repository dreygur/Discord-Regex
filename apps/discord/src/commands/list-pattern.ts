import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";
import { config } from "../config";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("list-pattern")
    .setDescription("Lists all regex pattern")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: CommandInteraction) => {
    try {
      const patterns = await database.getRegexesByServer(interaction.guildId as string);
      if (patterns.length === 0) {
        await interaction.reply("No patterns found.");
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.color as number)
        .setTitle('Pattern')
        .setDescription('The following pattern added successfully')
        .setThumbnail(config.thumbnail as string)
        .addFields(
          { name: 'Patterns', value: patterns.map(pattern => `${pattern.regexPattern} : ${pattern.webhookName}`).join("\n") },
        );
      // await interaction.reply(`Patterns:\n${patterns.map(pattern => `${pattern.regexPattern} : ${pattern.webhookName}`).join("\n")}`);
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply("An error occurred while listing the patterns.");
    }
  },
}

export { command };