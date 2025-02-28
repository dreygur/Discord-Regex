import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { BotCommand } from "../types";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("list-webhooks")
    .setDescription("Lists webhooks"),
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply("Pong!");
  },
}

export { command };