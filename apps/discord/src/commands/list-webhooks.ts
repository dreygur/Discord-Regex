import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";
import { config } from "../config";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("list-webhooks")
    .setDescription("Lists webhooks")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: CommandInteraction) => {
    try {
      const webhooks = await database.getAllWebhooksByServerId(interaction.guildId as string);
      if (webhooks.length === 0) {
        await interaction.reply("No webhooks found.");
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.color as number)
        .setTitle('Webhooks')
        .setDescription('The following webhooks are available')
        .setThumbnail(config.thumbnail as string)
        .addFields(
          { name: 'Webhooks', value: webhooks.map(hook => hook.name).join("\n") },
        );
      // await interaction.reply(`Webhooks:\n${webhooks.map(hook => hook.name).join("\n")}`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error retrieving webhooks:", error);
      await interaction.reply("An error occurred while retrieving webhooks.");
    }
  },
}

export { command };