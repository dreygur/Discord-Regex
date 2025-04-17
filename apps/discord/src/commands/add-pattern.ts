import { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type { CommandInteraction, SlashCommandStringOption } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";
import { config } from "../config";

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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: CommandInteraction) => {
    try {
      await database.addRegex(
        interaction.guildId as string,
        interaction.options.get('pattern')?.value as string,
        interaction.options.get('webhook')?.value as string
      );

      const embed = new EmbedBuilder()
        .setColor(config.color as number)
        .setTitle('Pattern')
        .setDescription('The following pattern added successfully')
        .setThumbnail(config.thumbnail as string)
        .addFields(
          { name: 'Pattern', value: interaction.options.get('pattern')?.value as string },
          { name: 'Webhook', value: interaction.options.get('webhook')?.value as string }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply("An error occurred while adding the regex pattern.");
    }
  },
}

export { command };