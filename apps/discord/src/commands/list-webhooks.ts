import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { BotCommand } from "../types";
import { database } from "../database";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("list-webhooks")
    .setDescription("Lists webhooks"),
  execute: async (interaction: CommandInteraction) => {
    try {
      // const webhooks = await database.getAllWebhooksByServerId(interaction.guildId as string);
      const webhooks = await database.getAllWebhooks();
      if (webhooks.length === 0) {
        await interaction.reply("No webhooks found.");
        return;
      }
      await interaction.reply(`Webhooks:\n${webhooks.map(hook => hook.name).join("\n")}`);
    } catch (error) {
      console.error("Error retrieving webhooks:", error);
      await interaction.reply("An error occurred while retrieving webhooks.");
    }
  },
}

export { command };